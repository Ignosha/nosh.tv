const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
function load(path, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(path,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  vm.runInNewContext(code,{exports,require:name=>dependencies[name],Error,Date,Map,Set,BigInt,Number,URLSearchParams,Object,String,Math,process});
  return exports;
}
const a = '0x'+'1'.repeat(40), b = '0x'+'2'.repeat(40);
test('Ethereum trace follows successful outbound native transfers and stops at labeled services',async()=>{
  const reads=[];
  const {traceEthereum}=load('src/lib/evmTrace.ts',{'./chains':{getJson:async url=>{
    reads.push(url);
    if(url.includes('/transactions?')) return {items:[{hash:'tx',timestamp:'2026-11-01T00:00:00Z',status:'ok',value:'1000000000000000000',from:{hash:a},to:{hash:b}},{hash:'failed',timestamp:'2026-11-01',status:'error',value:'9000000000000000000',from:{hash:a},to:{hash:b}}],next_page_params:null};
    return url.endsWith(b)?{hash:b,coin_balance:'0',public_tags:[{label:'Example Exchange'}]}:{hash:a,coin_balance:'2000000000000000000'};
  }}});
  const result=await traceEthereum([a],'ethereum',3);
  assert.equal(result.edges.length,1); assert.equal(result.edges[0].btc,1);
  assert.equal(result.nodes[1].label,'Example Exchange');assert.equal(result.nodes[1].kind,'service');
  assert.equal(reads.filter(u=>u.includes(b+'/transactions')).length,0);
});
test('Explorer failures stay unknown and are disclosed',async()=>{
  const {traceEthereum}=load('src/lib/evmTrace.ts',{'./chains':{getJson:async()=>{throw new Error('403')}}});
  const result=await traceEthereum([a]);
  assert.equal(result.nodes[0].balance,null);assert.equal(result.edges.length,0);assert.ok(result.limits.some(l=>l.includes('403')));
});
test('Same-week deadlines handle weekdays and weekend intake',()=>{
  const {sameWeekDue}=load('src/lib/firms.ts');
  assert.equal(sameWeekDue(new Date('2026-11-10T12:00:00Z')),'2026-11-13T23:59:59.999Z');
  assert.equal(sameWeekDue(new Date('2026-11-14T12:00:00Z')),'2026-11-20T23:59:59.999Z');
});
test('Premier is $10,000 monthly and never falls back to the old checkout',()=>{
  const {packageById,payLink}=load('src/lib/pricing.ts');
  const p=packageById('premier');assert.equal(p.price,10000);assert.equal(p.cadence,'month');assert.equal(p.includes.length,5);assert.equal(payLink('premier'),null);
});
test('Token evidence preserves exact quantities and identifies truncation',async()=>{
  const {tokenEvidence,decimalAmount}=load('src/lib/tokenEvidence.ts',{'./evmTrace':{EXPLORERS:{ethereum:{url:'https://eth.blockscout.com'}}},'./chains':{getJson:async()=>({items:[{transaction_hash:'0xabc',timestamp:'2026-11-10',from:{hash:a},to:{hash:b},token:{address_hash:b,symbol:'USDC',decimals:'6'},total:{value:'123456789012345678901234',decimals:'6'}}],next_page_params:{block:123}})}});
  const result=await tokenEvidence(a);
  assert.equal(result.transfers[0].amount,'123456789012345678.901234');
  assert.ok(result.limits.some(s=>s.includes('truncated')));
  assert.equal(decimalAmount('1',6),'0.000001');
  assert.throws(()=>decimalAmount('1',99));
});
test('Contribution estimates include labor and additional costs; zero revenue has no margin',()=>{
  const {contribution}=load('src/lib/servicePolicy.ts');
  const e=contribution(1000000,1500,100000);
  assert.equal(e.laborCents,312500);assert.equal(e.contributionCents,587500);assert.equal(contribution(0,60).margin,null);
});
test('Unclaimed or suppressed outreach step never sends',async()=>{
  let sent=0;
  const chain={update(){return this},eq(){return this},in(){return this},is(){return this},select:async()=>({data:[],error:null})};
  const {sendNextStep}=load('src/lib/outreachSend.ts',{'./db':{db:()=>({from:()=>chain})},'./email':{sendEmail:async()=>{sent++;return {ok:true}}},'./outreach':{outreachReady:()=>({ok:true}),draftStep:()=>({subject:'test',body:'test'})},'./leads':{},'./site':{SITE_URL:'https://example.com'}});
  const result=await sendNextStep({id:'id',email:'a@example.com',status:'queued',step:0});
  assert.equal(result.ok,false);assert.equal(sent,0);
});

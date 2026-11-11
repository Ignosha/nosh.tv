// Disposable browser/API/Postgres integration fixture. Never deploy this mock Auth provider.
const fs = require('node:fs'), http = require('node:http'), assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const { createServerClient } = require('@supabase/ssr');
const { chromium } = require('playwright');
const base = 'http://127.0.0.1:3198', provider = 'http://127.0.0.1:3871';
const key = 'sb_publishable_local_fixture';
(async () => {
  const db = new PGlite();
  const fixture = fs.readFileSync('tests/enterprise.cjs','utf8').match(/`(create role anon;[^`]+)`/s)[1];
  await db.exec(fixture);
  await db.exec(fs.readFileSync('supabase/company-setup.sql','utf8'));
  const uid = randomUUID(), now = new Date().toISOString();
  await db.query('insert into auth.users values($1,$2,now())',[uid,'owner@example.invalid']);
  const org = (await db.query("select kl_provision_organization('Fixture Company',$1) as id",[uid])).rows[0].id;
  const user = {id:uid,aud:'authenticated',role:'authenticated',email:'owner@example.invalid',email_confirmed_at:now,confirmed_at:now,created_at:now,updated_at:now,app_metadata:{provider:'email',providers:['email']},user_metadata:{},identities:[],factors:[{id:randomUUID(),factor_type:'totp',status:'verified',friendly_name:'Fixture',created_at:now,updated_at:now}]};
  const claims = {sub:uid,role:'authenticated',aud:'authenticated',email:user.email,aal:'aal2',iss:provider+'/auth/v1',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,session_id:randomUUID(),amr:[{method:'totp',timestamp:Math.floor(Date.now()/1000)}]};
  const token = [Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify(claims)).toString('base64url'),Buffer.alloc(32,1).toString('base64url')].join('.');
  const calls = [], errors = [];
  let queue = Promise.resolve();
  const tables = new Set(['kl_organizations','kl_org_members','kl_assurance_programs','kl_assurance_history','kl_action_reviews']);
  function inRole(authenticated, fn) {
    const task = queue.then(async()=>{
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify(authenticated?claims:{})]);
      await db.exec('set role '+(authenticated?'authenticated':'anon'));
      try { return await fn(); } finally { await db.exec('reset role'); }
    });
    queue = task.catch(()=>{}); return task;
  }
  const mock = http.createServer(async(req,res)=>{
    const url = new URL(req.url,provider);
    const authenticated = req.headers.authorization === 'Bearer '+token;
    function send(status,body){res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(body));}
    try {
      if(url.pathname==='/auth/v1/user') return authenticated?send(200,user):send(401,{message:'Missing fixture session'});
      if(!url.pathname.startsWith('/rest/v1/')) return send(404,{message:'Unknown fixture path'});
      let raw='';for await(const part of req)raw+=part;
      const body=raw?JSON.parse(raw):{};
      const resource=url.pathname.slice('/rest/v1/'.length);
      calls.push({method:req.method,resource});
      const result=await inRole(authenticated,async()=>{
        if(resource==='rpc/kl_company_save' && process.env.SAMPLE_FLOW_FAILURE==='1')throw Object.assign(new Error('Program quota reached'),{code:'P0001'});
        if(resource==='rpc/kl_company_save')return db.query('select * from kl_company_save($1,$2,$3,$4,$5)',[body.p_org,body.p_id,body.p_expected,JSON.stringify(body.p_workspace),body.p_reason]);
        if(resource==='rpc/kl_org_directory')return db.query('select * from kl_org_directory($1)',[body.p_org]);
        if(resource==='rpc/kl_enterprise_ready')return {rows:[{ready:(await db.query('select kl_enterprise_ready() as ready')).rows[0].ready}],scalar:true};
        if(!tables.has(resource)||req.method!=='GET')throw Error('Unexpected fixture operation');
        const columns=url.searchParams.get('select')||'*';
        if(columns!=='*'&&!/^[a-z_,]+$/.test(columns))throw Error('Unexpected fixture projection');
        const args=[],where=[];
        for(const [field,value] of url.searchParams){
          if(['select','order','limit'].includes(field))continue;
          if(!/^[a-z_]+$/.test(field)||!value.startsWith('eq.'))throw Error('Unexpected fixture filter');
          args.push(value.slice(3));where.push('"'+field+'"=$'+args.length);
        }
        let sql='select '+columns+' from '+resource+(where.length?' where '+where.join(' and '):'');
        const order=url.searchParams.get('order');
        if(order){const [field,direction]=order.split('.');if(!/^[a-z_]+$/.test(field)||!['asc','desc'].includes(direction))throw Error('Unexpected order');sql+=' order by "'+field+'" '+direction;}
        if(url.searchParams.has('limit'))sql+=' limit '+Math.min(100,Math.max(1,Number(url.searchParams.get('limit'))));
        return db.query(sql,args);
      });
      if(result.scalar)return send(200,result.rows[0].ready);
      if(req.headers.accept?.includes('application/vnd.pgrst.object+json'))return send(200,result.rows[0]??null);
      return send(200,result.rows);
    }catch(e){errors.push({path:url.pathname,code:e.code,message:e.message});return send(e.code==='42501'?403:400,{code:e.code??'FIXTURE',message:e.message,details:null,hint:null});}
  });
  await new Promise(resolve=>mock.listen(3871,'127.0.0.1',resolve));
  let browser,server,log='';
  try {
    const jar=[];
    const client=createServerClient(provider,key,{cookieOptions:{httpOnly:true,secure:false,sameSite:'lax'},cookies:{getAll:()=>jar,setAll:(cookies)=>{for(const c of cookies){const index=jar.findIndex(x=>x.name===c.name);if(index>=0)jar.splice(index,1);jar.push(c);}}}});
    const signed=await client.auth.setSession({access_token:token,refresh_token:'local-test-refresh'});
    assert.equal(signed.error,null);
    server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3198'],{env:{...process.env,ENTERPRISE_MODE:'1',APP_ORIGIN:base,NEXT_PUBLIC_SITE_URL:base,SUPABASE_URL:provider,SUPABASE_ANON_KEY:key,SUPABASE_SERVICE_ROLE_KEY:'',ADMIN_PASSWORD:''},stdio:['ignore','pipe','pipe']});
    server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
    for(let i=0;i<80;i++){try{if((await fetch(base+'/api/health/live')).ok)break}catch{}await new Promise(r=>setTimeout(r,250));}
    browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE||undefined,args:['--no-sandbox']});
    const context=await browser.newContext({viewport:{width:375,height:812},javaScriptEnabled:process.env.SAMPLE_FLOW_NO_JS!=='1'});
    await context.addCookies(jar.filter(c=>c.value).map(c=>({name:c.name,value:c.value,url:base,httpOnly:true,secure:false,sameSite:'Lax'})));
    const page=await context.newPage();const clientErrors=[];
    page.on('pageerror',e=>clientErrors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')clientErrors.push(m.text());});
    await page.goto(base+'/workspace');
    await page.getByRole('heading',{name:'Your organizations'}).waitFor();
    await page.waitForLoadState('domcontentloaded');
    const headers=await context.request.get(base+'/workspace');
    assert.equal(headers.headers()['referrer-policy'],'same-origin');
    await page.getByRole('button',{name:'Create sample program'}).click();
    if(process.env.SAMPLE_FLOW_FAILURE==='1'){
      await page.waitForURL(/sample_error=quota/,{timeout:15000});
      await page.getByRole('alert').filter({hasText:'program limit'}).waitFor();
      assert.equal((await db.query('select count(*)::int as n from kl_assurance_programs')).rows[0].n,0);
      console.log('PASS sample quota failure returns a visible error and creates no program');return;
    }
    try{await page.waitForURL(/\/programs\/[0-9a-f-]+$/,{timeout:15000});}
    catch(e){
      console.log(JSON.stringify({reproduction:'stalled',url:page.url(),body:(await page.locator('body').innerText()).slice(-1800),clientErrors,providerErrors:errors,calls,serverLog:log.slice(-2000)}));throw e;
    }
    await page.getByRole('heading',{name:'First test program',exact:true}).waitFor();
    await page.reload();await page.getByRole('heading',{name:'First test program',exact:true}).waitFor();
    await page.goto(base+'/workspace');
    await page.getByRole('button',{name:'Create sample program'}).click();
    await page.waitForURL(/\/programs\/[0-9a-f-]+$/,{timeout:15000});
    const audit=(await db.query('select actor_id,reason from kl_assurance_history where organization_id=$1',[org])).rows;
    assert.equal(audit.length,1);assert.equal(audit[0].actor_id,uid);assert.equal(audit[0].reason,'Initial setup: create sample program');
    assert.equal(calls.filter(c=>c.resource==='rpc/kl_company_save').length,1);
    const saved=(await db.query('select name,revision from kl_assurance_programs where organization_id=$1',[org])).rows;
    assert.equal(saved.length,1);assert.equal(saved[0].name,'First test program');assert.equal(saved[0].revision,1);
    assert.equal(errors.length,0);
    assert.ok(!clientErrors.some(e=>e.includes('Content Security Policy')));
    console.log('PASS '+(process.env.SAMPLE_FLOW_NO_JS==='1'?'native form without JavaScript':'hydrated form')+': real Next action, fixture Auth, Postgres save/audit, redirect, reload and existing-program reuse');
  }finally{await browser?.close();server?.kill('SIGTERM');await new Promise(r=>mock.close(r));await db.close();}
})().catch(e=>{console.error('Fixture flow failed:',e.message);process.exit(1)});

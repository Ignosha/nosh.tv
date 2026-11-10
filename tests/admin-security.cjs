const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const base=process.env.REPORT_STUDIO_URL||'http://localhost:3100',password=process.env.TEST_ADMIN_PASSWORD;
 if(!password)throw new Error('Set TEST_ADMIN_PASSWORD to the local test server password');
 if(!['localhost','127.0.0.1'].includes(new URL(base).hostname))throw new Error('This acceptance check is restricted to a local test server');
 const manifest=JSON.parse(fs.readFileSync('.next/server/server-reference-manifest.json','utf8'));
 const [id]=Object.entries(manifest.node).find(([,entry])=>entry.exportedName==='saveProgram');
 // Invalid input guarantees no database write even if test credentials are configured.
 const body=JSON.stringify([null,0,{},'Test operator','Invalid-input security acceptance']);
 const headers={'Next-Action':id,'Content-Type':'text/plain;charset=UTF-8',Origin:base};
 const denied=await fetch(base+'/assurance',{method:'POST',headers,body});const deniedBody=await denied.text();
 const allowed=await fetch(base+'/assurance',{method:'POST',headers:{...headers,Authorization:'Basic '+Buffer.from('admin:'+password).toString('base64')},body});const allowedBody=await allowed.text();
 assert.equal(allowed.status,200);assert.ok(allowed.headers.get('content-type').includes('text/x-component'));assert.match(allowedBody,/Configure the database|Unsupported assurance workspace/);
 // Next can return HTTP 200 with empty JSON after a denied internal action forward.
 // Validate that the unauthenticated call never receives the action result, not just its transport code.
 assert.notEqual(deniedBody,allowedBody);assert.doesNotMatch(deniedBody,/Configure the database|Unsupported assurance workspace/);
 const admin=await fetch(base+'/admin/assurance');assert.equal(admin.status,401);
 const malformed=await fetch(base+'/admin/assurance',{headers:{Authorization:'Basic !!!'}});assert.equal(malformed.status,401);
 console.log('PASS: public action forwarding yields no unauthenticated action result, authenticated invalid input is safely rejected, and admin routes deny missing/malformed credentials.');
})().catch(e=>{console.error(e);process.exit(1)});

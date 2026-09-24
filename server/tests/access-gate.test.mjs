import test from 'node:test';import assert from 'node:assert/strict';
import {createServer} from '../index.mjs';
import {createStore} from '../store.mjs';
import {emailVerified} from '../auth.mjs';
import {clientIp,requiresAccount} from '../access.mjs';
import {createUsage} from '../usage.mjs';

const reply=x=>({ok:true,status:200,json:async()=>x});
const supabase={SUPABASE_URL:'https://auth.example',SUPABASE_ANON_KEY:'public'};
// Two accounts: alice has confirmed her email, bob has not.
function fakeSupabase(calls){
 const user=id=>({id,email:id+'@example.test',...(id==='alice'?{email_confirmed_at:'2026-09-24T10:00:00Z'}:{})});
 return async(url,options)=>{
  if(url.includes('token?')){const id=JSON.parse(options.body).email.split('@')[0];return reply({user:user(id),access_token:'token-'+id,refresh_token:'r',expires_in:3600});}
  if(url.endsWith('/auth/v1/user')){calls.push(url);return reply(user(options.headers.Authorization.slice('Bearer token-'.length)));}
  throw new Error('unexpected '+url);
 };
}
async function start(env){
 const calls=[],store=createStore(':memory:');
 const {server}=createServer({store,env:{...supabase,...env},fetchImpl:fakeSupabase(calls)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const post=(path,payload,cookie)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(payload)});
 const login=async who=>(await post('/api/auth/login',{email:who+'@example.test',password:'password-1'})).headers.get('set-cookie').split(';')[0];
 const dossier=store.listDossiers()[0].id;
 return {base,post,login,dossier,calls,close:async()=>{await new Promise(r=>server.close(r));store.close();}};
}

test('paid policy: anonymous and unverified readers cannot reach model routes; verified readers can',async()=>{
 const app=await start({ACCESS_POLICY:'paid'});
 try{
  const ask={dossierId:app.dossier,question:'Explain this proposal',language:'en'};
  const anonymous=await app.post('/api/ask',ask);assert.equal(anonymous.status,401);assert.equal((await anonymous.json()).error,'SIGN_IN_REQUIRED');
  const stream=await app.post('/api/parliament/ask/stream',{question:'What was said?',language:'en'});
  assert.equal(stream.status,401,'refused before the stream opens');assert.match(stream.headers.get('content-type'),/json/);
  const bob=await app.login('bob');const unverified=await app.post('/api/ask',ask,bob);assert.equal(unverified.status,403);assert.equal((await unverified.json()).error,'EMAIL_NOT_VERIFIED');
  const alice=await app.login('alice');assert.equal((await app.post('/api/ask',ask,alice)).status,200);
  const health=await (await fetch(app.base+'/api/health')).json();assert.equal(health.access,'paid');
  assert.equal((await fetch(app.base+'/api/dossiers')).status,200,'reading routes stay open under paid');
 }finally{await app.close();}
});

test('verified policy closes the whole API except health, sign-in and the account itself',async()=>{
 const app=await start({ACCESS_POLICY:'verified'});
 try{
  assert.equal((await fetch(app.base+'/api/dossiers')).status,401);
  assert.equal((await fetch(app.base+'/api/health')).status,200);
  assert.equal((await fetch(app.base+'/api/auth/providers')).status,200);
  const bob=await app.login('bob');
  const me=await (await fetch(app.base+'/api/me',{headers:{Cookie:bob}})).json();assert.equal(me.emailVerified,false,'the app can show the verify-email step');
  assert.equal((await fetch(app.base+'/api/dossiers',{headers:{Cookie:bob}})).status,403);
  const alice=await app.login('alice');
  assert.equal((await fetch(app.base+'/api/dossiers',{headers:{Cookie:alice}})).status,200);
  const before=app.calls.length;await fetch(app.base+'/api/dossiers',{headers:{Cookie:alice}});assert.equal(app.calls.length,before,'the session check is cached');
 }finally{await app.close();}
});

test('each verified reader has a daily question allowance with its reset time',async()=>{
 const app=await start({ACCESS_POLICY:'paid',ASK_DAILY_LIMIT:'2'});
 try{
  const alice=await app.login('alice'),ask={dossierId:app.dossier,question:'Explain this proposal',language:'en'};
  assert.equal((await app.post('/api/ask',ask,alice)).status,200);assert.equal((await app.post('/api/ask',ask,alice)).status,200);
  const third=await app.post('/api/ask',ask,alice);assert.equal(third.status,429);
  const body=await third.json();assert.equal(body.error,'DAILY_LIMIT_REACHED');assert.equal(body.limit,2);assert.match(body.resetAt,/T00:00:00/);
  const usage=await (await fetch(app.base+'/api/me/usage',{headers:{Cookie:alice}})).json();assert.equal(usage.questions.day.used,2);assert.equal(usage.questions.week.limit,100);
 }finally{await app.close();}
});

test('open policy keeps today\'s behaviour, and a gated policy needs sign-in configured',async()=>{
 const app=await start({});
 try{assert.equal((await app.post('/api/ask',{dossierId:app.dossier,question:'Explain this proposal',language:'en'})).status,200);}finally{await app.close();}
 assert.throws(()=>createServer({store:createStore(':memory:'),env:{ACCESS_POLICY:'verified'}}),/ACCESS_POLICY_REQUIRES_AUTH/);
 assert.throws(()=>createServer({store:createStore(':memory:'),env:{ACCESS_POLICY:'everyone'}}),/INVALID_ACCESS_POLICY/);
});

test('verification, routing, client address and weekly allowance rules',()=>{
 assert.equal(emailVerified({email_confirmed_at:'2026-09-24'}),true);
 assert.equal(emailVerified({identities:[{provider:'google',identity_data:{email_verified:true}}]}),true);
 assert.equal(emailVerified({identities:[{provider:'discord',identity_data:{email_verified:false}}]}),false);
 assert.equal(requiresAccount('paid','/api/parliament/business/1'),false);assert.equal(requiresAccount('paid','/api/parliament/ask'),true);
 assert.equal(requiresAccount('verified','/api/me/usage'),false);assert.equal(requiresAccount('verified','/Switzerland/index.html'),false);
 const req=h=>({headers:h,socket:{remoteAddress:'10.0.0.1'}});
 assert.equal(clientIp(req({'x-client-ip':'1.2.3.4','x-proxy-key':'secret'}),{PROXY_SHARED_SECRET:'secret'}),'1.2.3.4');
 assert.equal(clientIp(req({'x-client-ip':'1.2.3.4','x-proxy-key':'guess!'}),{PROXY_SHARED_SECRET:'secret'}),'10.0.0.1');
 assert.equal(clientIp(req({'x-client-ip':'1.2.3.4'}),{}),'10.0.0.1');
 const store=createStore(':memory:');let now=new Date('2026-09-24T12:00:00Z');
 const usage=createUsage(store.db,{ASK_DAILY_LIMIT:'0',ASK_WEEKLY_LIMIT:'3'},{clock:()=>now});
 for(let i=0;i<3;i++)usage.consume('u1');
 assert.throws(()=>usage.consume('u1'),e=>e.message==='WEEKLY_LIMIT_REACHED'&&e.details.resetAt==='2026-09-28T00:00:00.000Z');
 now=new Date('2026-09-28T01:00:00Z');assert.equal(usage.consume('u1').week.used,1,'a new week starts on Monday');
 store.close();
});

import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from '../index.mjs';
import {createStore} from '../store.mjs';
import {anonymousAllowance,anonymousQuestion,anonymousSalt,anonymousSubject,hasSessionCookie} from '../access.mjs';
import {createUsage} from '../usage.mjs';
import {publicBusinessIds} from '../votes.mjs';

const reply=x=>({ok:true,status:200,json:async()=>x});
const supabase={SUPABASE_URL:'https://auth.example',SUPABASE_ANON_KEY:'public'};
const votes=JSON.parse(readFileSync(new URL('../../config/votes/votes-20260927.json',import.meta.url),'utf8'));
const approved=votes.objects.find(o=>o.review?.status==='approved');
// One verified account, and a model endpoint that nobody configured: every other request is a test failure.
function fakeSupabase(calls=[]){
 const user={id:'alice',email:'alice@example.test',email_confirmed_at:'2026-09-24T10:00:00Z'};
 return async(url,options)=>{
  calls.push(String(url));
  if(url.includes('token?'))return reply({user,access_token:'token-alice',refresh_token:'r',expires_in:3600});
  if(url.endsWith('/auth/v1/user'))return reply(user);
  throw new Error('unexpected '+url);
 };
}
async function start(env,calls=[]){
 const store=createStore(':memory:');
 const {server}=createServer({store,env:{...supabase,ACCESS_POLICY:'paid',PREPARED_ANSWERS:'off',...env},fetchImpl:fakeSupabase(calls)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+server.address().port;
 const post=(path,payload,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(payload)});
 const ask=(payload,headers)=>post('/api/parliament/ask/stream',{language:'en',question:'What was argued on each side?',businessId:approved.businessId,...payload},headers);
 // The table is made with the first count, so before it there is nothing to read.
 const counts=()=>store.db.prepare("SELECT name FROM sqlite_master WHERE name='usage'").get()?Object.fromEntries(store.db.prepare("SELECT subject,count FROM usage WHERE kind='anonymous'").all().map(r=>[r.subject,r.count])):{};
 return {base,post,ask,counts,store,close:async()=>{await new Promise(r=>server.close(r));store.close();}};
}
const guests={ANONYMOUS_ASK_DAILY_LIMIT:'2',ANONYMOUS_ASK_DAILY_TOTAL:'50',ANONYMOUS_ASK_SALT:'a-secret-salt'};

test('the allowance is off unless both limits are set, and anonymous readers are refused as before',async()=>{
 assert.equal(anonymousAllowance({}),null);
 assert.equal(anonymousAllowance({ANONYMOUS_ASK_DAILY_LIMIT:'3'}),null,'a limit per reader without a total opens nothing');
 assert.equal(anonymousAllowance({ANONYMOUS_ASK_DAILY_TOTAL:'200'}),null);
 for(const bad of ['0','-1','2.5','many',''])assert.equal(anonymousAllowance({ANONYMOUS_ASK_DAILY_LIMIT:bad,ANONYMOUS_ASK_DAILY_TOTAL:'200'}),null,bad);
 assert.deepEqual(anonymousAllowance({ANONYMOUS_ASK_DAILY_LIMIT:'3',ANONYMOUS_ASK_DAILY_TOTAL:'200'}),{perReader:3,total:200});
 const app=await start({});
 try{
  const refused=await app.ask();assert.equal(refused.status,401);assert.equal((await refused.json()).error,'SIGN_IN_REQUIRED');
  assert.equal((await (await fetch(app.base+'/api/health')).json()).anonymousQuestions,null);
  assert.deepEqual(app.counts(),{});
 }finally{await app.close();}
});

test('a guest may ask about a vote whose brief is approved, and the question is counted twice: for the reader and for all',async()=>{
 const app=await start(guests);
 try{
  assert.deepEqual((await (await fetch(app.base+'/api/health')).json()).anonymousQuestions,{perDay:2});
  const first=await app.ask();
  assert.equal(first.status,200);assert.match(first.headers.get('content-type'),/x-ndjson/);
  const events=(await first.text()).trim().split('\n').map(line=>JSON.parse(line));
  assert.ok(['answer','error'].includes(events.at(-1).type),'the stream ends with an answer or with a stated failure');
  const counts=app.counts();
  assert.equal(counts['anon:all'],1);
  const readers=Object.keys(counts).filter(k=>k!=='anon:all');
  assert.equal(readers.length,1);assert.match(readers[0],/^anon:[0-9a-f]{32}$/);assert.equal(counts[readers[0]],1);
  // Nothing in the table is an address.
  for(const row of app.store.db.prepare('SELECT * FROM usage').all())assert.doesNotMatch(JSON.stringify(row),/127\.0\.0\.1|::1|::ffff/);
 }finally{await app.close();}
});

test('a guest is refused outside that scope, before anything is counted',async()=>{
 const app=await start(guests);
 try{
  for(const payload of [{businessId:'19990001'},{businessId:undefined},{businessId:{id:approved.businessId}},{businessId:''}]){
   const r=await app.ask(payload);assert.equal(r.status,401,JSON.stringify(payload));assert.equal((await r.json()).error,'SIGN_IN_REQUIRED');
  }
  // The length of a question is the one every reader has.
  const long=await app.ask({question:'x'.repeat(501)});
  assert.equal(long.status,400);assert.equal((await long.json()).error,'INVALID_REQUEST');
  // The other model routes stay closed to guests.
  for(const path of ['/api/parliament/ask','/api/parliament/translate','/api/parliament/compare','/api/parliament/draft','/api/parliament/video-search'])
   assert.equal((await app.post(path,{question:'What was said?',language:'en',businessId:approved.businessId})).status,401,path);
  assert.deepEqual(app.counts(),{});
 }finally{await app.close();}
});

test('a request with a session cookie is judged as an account, never as a guest',async()=>{
 assert.equal(hasSessionCookie('pilot_session=abc'),true);assert.equal(hasSessionCookie('theme=dark; pilot_session=abc'),true);
 assert.equal(hasSessionCookie('not_pilot_session=abc'),false);assert.equal(hasSessionCookie(undefined),false);
 const app=await start(guests);
 try{
  const stale=await app.ask({}, {Cookie:'pilot_session=not-a-session'});
  assert.equal(stale.status,401,'a worthless cookie does not fall back to the guest allowance');
  assert.deepEqual(app.counts(),{});
  const login=await app.post('/api/auth/login',{email:'alice@example.test',password:'password-1'});
  const cookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await app.ask({},{Cookie:cookie})).status,200);
  assert.deepEqual(app.counts(),{},'an account uses its own allowance');
  const usage=await (await fetch(app.base+'/api/me/usage',{headers:{Cookie:cookie}})).json();assert.equal(usage.questions.day.used,1);
 }finally{await app.close();}
});

test('the reader\'s limit and the limit of all readers both stop a question, with the time they reset',async()=>{
 const app=await start(guests);
 try{
  assert.equal((await app.ask()).status,200);assert.equal((await app.ask()).status,200);
  const third=await app.ask();assert.equal(third.status,429);
  const body=await third.json();assert.equal(body.error,'DAILY_LIMIT_REACHED');assert.equal(body.limit,2);assert.equal(body.kind,'anonymous');assert.match(body.resetAt,/T00:00:00/);
  assert.equal(app.counts()['anon:all'],2,'a refused question is not counted');
 }finally{await app.close();}
 const store=createStore(':memory:');let now=new Date('2026-10-05T23:30:00Z');
 const usage=createUsage(store.db,{},{clock:()=>now});
 const limits={perReader:2,total:3};
 usage.consumeAnonymous('anon:a',limits);usage.consumeAnonymous('anon:a',limits);usage.consumeAnonymous('anon:b',limits);
 assert.throws(()=>usage.consumeAnonymous('anon:c',limits),e=>e.message==='ANONYMOUS_CAPACITY_REACHED'&&e.status===429&&e.details.limit===3&&e.details.resetAt==='2026-10-06T00:00:00.000Z');
 assert.throws(()=>usage.consumeAnonymous('anon:a',limits),e=>e.message==='DAILY_LIMIT_REACHED','the reader\'s own limit is named first');
 assert.equal(store.db.prepare("SELECT count FROM usage WHERE subject='anon:c'").get(),undefined,'a refused reader leaves no row');
 now=new Date('2026-10-06T00:00:01Z');
 assert.deepEqual(usage.consumeAnonymous('anon:c',limits),{used:1,limit:2,resetAt:'2026-10-07T00:00:00.000Z'},'both limits start again with the UTC day');
 // An account's allowance is a different kind and is not touched.
 assert.equal(usage.summary('anon:a','ask').day.used,0);
 store.close();
});

test('the reader\'s key needs a secret salt, changes with the day, and says nothing about the address',()=>{
 const key=anonymousSubject('203.0.113.7','2026-10-05','salt-one');
 assert.match(key,/^anon:[0-9a-f]{32}$/);assert.doesNotMatch(key,/203|113/);
 assert.equal(anonymousSubject('203.0.113.7','2026-10-05','salt-one'),key,'the same reader on the same day is the same key');
 assert.notEqual(anonymousSubject('203.0.113.7','2026-10-06','salt-one'),key);
 assert.notEqual(anonymousSubject('203.0.113.8','2026-10-05','salt-one'),key);
 assert.notEqual(anonymousSubject('203.0.113.7','2026-10-05','salt-two'),key);
 assert.throws(()=>anonymousSubject('203.0.113.7','2026-10-05',''),/ANONYMOUS_SALT_REQUIRED/);
 assert.equal(anonymousSalt({ANONYMOUS_ASK_SALT:'configured'}),'configured');
 const drawn=anonymousSalt({});assert.match(drawn,/^[0-9a-f]{48}$/);assert.notEqual(anonymousSalt({}),drawn,'a salt drawn at start is never a constant');
});

test('a guest\'s question keeps three fields and is answered from the record only',()=>{
 const ids=publicBusinessIds(new URL('../..',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
 assert.ok(ids.has(String(approved.businessId)));
 for(const o of votes.objects.filter(o=>o.review?.status!=='approved'))assert.equal(ids.has(String(o.businessId)),false,'a draft opens nothing');
 const asked=anonymousQuestion({question:'  What is asked?  ',language:'fr',businessId:Number(approved.businessId),thread:[{question:'x'}],personId:'4242',passageId:'p1',filters:{year:2020},webResearch:true,scopeTitle:'anything'},ids);
 assert.deepEqual(asked,{question:'What is asked?',language:'fr',businessId:String(approved.businessId),recordOnly:true});
 assert.equal(anonymousQuestion({question:'What is asked?',businessId:approved.businessId},ids).language,'en');
});

test('the question of a guest never starts web research, which is paid for per search',async()=>{
 const calls=[];
 const app=await start({...guests,OPENAI_API_KEY:'test-key',WEB_RESEARCH_MODEL:'a-search-model'},calls);
 try{
  // The words ask for news, which sends an account's question to the web as well.
  const asked=await app.ask({question:'What is the latest news on this vote?',webResearch:true});
  assert.equal(asked.status,200);
  const last=(await asked.text()).trim().split(/\n/).map(line=>JSON.parse(line)).at(-1);
  if(last.type==='answer'){assert.equal(last.answer.web,undefined);assert.equal(last.answer.webStatus,undefined);}
  assert.deepEqual(calls,[],'no request left the server');
 }finally{await app.close();}
});

// Who may use which API route. ACCESS_POLICY:
//   open      anyone (local development and tests)
//   paid      a verified account for every route that calls a model or sends email
//   verified  a verified account for the whole app API
// Health, sign-in and the account's own state stay reachable, so an unverified reader can finish signing in.
import {createHash,randomBytes,timingSafeEqual} from 'node:crypto';
export const POLICIES=['open','paid','verified'];
export function accessPolicy(env){const p=env.ACCESS_POLICY||'open';if(!POLICIES.includes(p))throw new Error('INVALID_ACCESS_POLICY');return p;}
// Routes that spend model tokens or send email.
export const PAID_ROUTES=new Set(['/api/parliament/ask','/api/parliament/ask/stream','/api/parliament/translate','/api/parliament/compare','/api/parliament/draft','/api/parliament/video-search','/api/parliament/proposals','/api/ask','/api/feedback','/api/health/ai']);
// Model routes that use the reader's question allowance.
export const QUESTION_ROUTES=new Set(['/api/parliament/ask','/api/parliament/ask/stream','/api/ask','/api/parliament/compare','/api/parliament/draft']);
// Vote Companion briefs are public: cached, reviewed, no per-view cost (docs/VOTE-COMPANION-SPEC.md).
const alwaysOpen=p=>p==='/api/health'||p.startsWith('/api/auth/')||p==='/api/me'||p.startsWith('/api/me/')||p==='/api/votes'||p.startsWith('/api/votes/');
export function requiresAccount(policy,p){
 if(policy==='open'||!p.startsWith('/api/')||alwaysOpen(p))return false;
 return policy==='verified'||PAID_ROUTES.has(p);
}
// A reader without an account may ask about a vote whose brief is public (docs/VOTE-COMPANION-SPEC.md). The
// allowance exists only when BOTH limits are set: one for each reader and one for all of them together, per UTC
// day. With either missing, anonymous readers are refused as before.
export const ANONYMOUS_ROUTE='/api/parliament/ask/stream';
export function anonymousAllowance(env){
 const n=value=>{const x=Number(value);return Number.isInteger(x)&&x>0?x:0;};
 const perReader=n(env.ANONYMOUS_ASK_DAILY_LIMIT),total=n(env.ANONYMOUS_ASK_DAILY_TOTAL);
 return perReader&&total?{perReader,total}:null;
}
// A request with a session cookie belongs to an account and is judged as one, whatever the cookie is worth.
export const hasSessionCookie=cookie=>/(?:^|;\s*)pilot_session=/.test(String(cookie||''));
// A reader is counted under a salted hash of the address and the day, so the usage table never holds an
// address and the key of one day cannot be matched with the key of the next. Addresses are few enough to try
// them all, so the salt must be secret: without ANONYMOUS_ASK_SALT one is drawn at start, and a restart then
// gives each reader a new count for the day. The count of all readers together is kept either way.
export const anonymousSalt=env=>env.ANONYMOUS_ASK_SALT||randomBytes(24).toString('hex');
export function anonymousSubject(ip,day,salt){
 if(!salt)throw new Error('ANONYMOUS_SALT_REQUIRED');
 return 'anon:'+createHash('sha256').update([salt,day,String(ip||'')].join('|')).digest('hex').slice(0,32);
}
// What an anonymous question may carry: the question, its language and the proposal of a public vote. A thread,
// a person, a passage, filters and web research belong to accounts, so they are dropped, not refused: the app
// sends none of them, and a caller who adds one gets the plain question answered, from the record only.
export function anonymousQuestion(b,publicBusinessIds){
 const businessId=typeof b.businessId==='string'||typeof b.businessId==='number'?String(b.businessId):'';
 if(!businessId||!publicBusinessIds.has(businessId))throw Object.assign(new Error('SIGN_IN_REQUIRED'),{status:401});
 return {question:b.question.trim(),language:b.language||'en',businessId,recordOnly:true};
}
// The PHP bridge on the public site forwards the reader's address with a shared secret; any other caller
// (including someone calling the edge directly) is keyed by its own socket address.
export function clientIp(req,env){
 const secret=env.PROXY_SHARED_SECRET,given=String(req.headers['x-proxy-key']||''),ip=String(req.headers['x-client-ip']||'');
 if(secret&&given.length===secret.length&&timingSafeEqual(Buffer.from(given),Buffer.from(secret))&&/^[0-9a-fA-F:.]{3,45}$/.test(ip))return ip;
 return req.socket.remoteAddress;
}
// Fixed one-minute windows per key.
export function createRateLimiter({now=()=>Date.now()}={}){
 const windows=new Map();
 return (key,limit)=>{
  const t=now();if(windows.size>20000)for(const [k,v]of windows)if(v.until<t)windows.delete(k);
  const w=windows.get(key)?.until>t?windows.get(key):{count:0,until:t+60000};w.count++;windows.set(key,w);
  if(w.count>limit)throw Object.assign(new Error('RATE_LIMITED'),{status:429,details:{retryAfterSeconds:Math.ceil((w.until-t)/1000)}});
 };
}

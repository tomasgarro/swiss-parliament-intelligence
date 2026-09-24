// Who may use which API route. ACCESS_POLICY:
//   open      anyone (local development and tests)
//   paid      a verified account for every route that calls a model or sends email
//   verified  a verified account for the whole app API
// Health, sign-in and the account's own state stay reachable, so an unverified reader can finish signing in.
import {timingSafeEqual} from 'node:crypto';
export const POLICIES=['open','paid','verified'];
export function accessPolicy(env){const p=env.ACCESS_POLICY||'open';if(!POLICIES.includes(p))throw new Error('INVALID_ACCESS_POLICY');return p;}
// Routes that spend model tokens or send email.
export const PAID_ROUTES=new Set(['/api/parliament/ask','/api/parliament/ask/stream','/api/parliament/translate','/api/parliament/compare','/api/parliament/draft','/api/parliament/video-search','/api/parliament/proposals','/api/ask','/api/feedback','/api/health/ai']);
// Model routes that use the reader's question allowance.
export const QUESTION_ROUTES=new Set(['/api/parliament/ask','/api/parliament/ask/stream','/api/ask','/api/parliament/compare','/api/parliament/draft']);
const alwaysOpen=p=>p==='/api/health'||p.startsWith('/api/auth/')||p==='/api/me'||p.startsWith('/api/me/');
export function requiresAccount(policy,p){
 if(policy==='open'||!p.startsWith('/api/')||alwaysOpen(p))return false;
 return policy==='verified'||PAID_ROUTES.has(p);
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

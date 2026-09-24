// Per-user question allowances, kept in the application database (data/pilot.sqlite), which releases never
// replace. Days are UTC; weeks start on Monday (UTC). Limits come from the environment so they can be
// rebalanced as usage grows, without a release.
const day=now=>now.toISOString().slice(0,10);
const monday=now=>{const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+6)%7));return d;};
const plusDays=(date,n)=>{const d=new Date(date);d.setUTCDate(d.getUTCDate()+n);return d.toISOString();};
export function usageLimits(env){
 const n=(value,fallback)=>{const x=Number(value);return Number.isFinite(x)&&x>=0?x:fallback;};
 return {ask:{day:n(env.ASK_DAILY_LIMIT,20),week:n(env.ASK_WEEKLY_LIMIT,100)},translate:{day:n(env.TRANSLATE_DAILY_LIMIT,60),week:n(env.TRANSLATE_WEEKLY_LIMIT,300)}};
}
export function createUsage(db,env,{clock=()=>new Date()}={}){
 db.exec('CREATE TABLE IF NOT EXISTS usage(period TEXT NOT NULL, subject TEXT NOT NULL, kind TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY(period,subject,kind))');
 const read=db.prepare('SELECT count FROM usage WHERE period=? AND subject=? AND kind=?');
 const bump=db.prepare('INSERT INTO usage VALUES(?,?,?,1) ON CONFLICT(period,subject,kind) DO UPDATE SET count=count+1');
 const periods=()=>{const now=clock(),week=monday(now);return {day:{key:'d:'+day(now),resetAt:plusDays(day(now)+'T00:00:00Z',1)},week:{key:'w:'+day(week),resetAt:plusDays(week,7)}};};
 const limits=usageLimits(env);
 function summary(subject,kind='ask'){
  const p=periods(),used=k=>read.get(p[k].key,subject,kind)?.count||0;
  return {day:{used:used('day'),limit:limits[kind].day,resetAt:p.day.resetAt},week:{used:used('week'),limit:limits[kind].week,resetAt:p.week.resetAt}};
 }
 return {
  summary,
  // Checks both allowances, then counts the request; a limit of 0 means unlimited.
  consume(subject,kind='ask'){
   const s=summary(subject,kind);
   for(const scope of ['day','week']){const {used,limit,resetAt}=s[scope];if(limit&&used>=limit)throw Object.assign(new Error(scope==='day'?'DAILY_LIMIT_REACHED':'WEEKLY_LIMIT_REACHED'),{status:429,details:{limit,used,resetAt,kind}});}
   const p=periods();db.exec('BEGIN');try{bump.run(p.day.key,subject,kind);bump.run(p.week.key,subject,kind);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
   return summary(subject,kind);
  }
 };
}

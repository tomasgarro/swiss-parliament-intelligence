// Vote Companion data: one file per federal vote date in config/votes/, generated ahead of time by
// scripts/generate-vote-briefs.mjs and shipped with the code release. Pages read it through public routes, so a
// brief costs nothing per view. Only objects whose brief passed human review are served (see docs/VOTE-COMPANION-SPEC.md).
import {existsSync,readdirSync,readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';

let cache=null;
function load(root){
 const dir=join(root,'config/votes');if(!existsSync(dir))return [];
 const files=readdirSync(dir).filter(f=>/^votes-\d{8}\.json$/.test(f)).sort();
 const stamp=files.map(f=>f+statSync(join(dir,f)).mtimeMs).join('|');
 if(cache?.stamp===stamp)return cache.dates;
 const dates=files.map(f=>JSON.parse(readFileSync(join(dir,f),'utf8')));cache={stamp,dates};return dates;
}
// A brief goes public only once a named reviewer has approved it; VOTES_PREVIEW=on shows drafts (local review only).
const visible=(object,env)=>object.review?.status==='approved'||env.VOTES_PREVIEW==='on';
const card=o=>({id:o.id,type:o.type,title:o.title,businessNumber:o.businessNumber,doubleMajority:o.doubleMajority,briefUpdated:o.brief?.generatedAt||null,reviewed:o.review?.status==='approved'});
export function voteIndex(root,env={}){
 return {dates:load(root).map(d=>({date:d.voteDate,officialUrl:d.officialUrl||null,objects:d.objects.filter(o=>visible(o,env)).map(card),inPreparation:d.objects.filter(o=>!visible(o,env)).map(o=>({id:o.id,title:o.title}))}))};
}
export function voteObject(root,id,env={}){
 for(const d of load(root))for(const o of d.objects)if(o.id===String(id)&&visible(o,env))return {...o,voteDate:d.voteDate,dateOfficialUrl:d.officialUrl||null};
 return null;
}

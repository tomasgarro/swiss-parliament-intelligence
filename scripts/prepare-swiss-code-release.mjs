// Code-only update. Existing production account and public-data volumes remain untouched.
import {mkdirSync,cpSync,copyFileSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
if(!readFileSync('frontend/dist/client/index.html','utf8').includes('src="/Switzerland/assets/'))throw Error('INVALID_MOUNT (in Git Bash: MSYS_NO_PATHCONV=1 VITE_PUBLIC_PATH=/Switzerland/)');
const base='artifacts/swiss-code-release-'+new Date().toISOString().replace(/[:.]/g,'-');
const site=base+'/site/Switzerland',backend=base+'/backend';mkdirSync(site,{recursive:true});mkdirSync(backend,{recursive:true});
cpSync('frontend/dist/client',site,{recursive:true});
// Same backend contents as the full release: server without tests, config, locked dependencies, bootstrap.
cpSync('server',backend+'/server',{recursive:true,filter:src=>!/[\\/]tests([\\/]|$)/.test(src)});cpSync('config',backend+'/config',{recursive:true});
for(const file of ['package.json','package-lock.json'])copyFileSync(file,backend+'/'+file);copyFileSync('deploy/switzerland/bootstrap.mjs',backend+'/bootstrap.mjs');
// Prepared answers ship with the code so a screened correction doesn't need a corpus release.
if(existsSync('data/parliament/prepared-answers.json'))copyFileSync('data/parliament/prepared-answers.json',backend+'/config/prepared-answers.json');
const archive=base+'/backend.tgz';execFileSync('tar',['-czf',archive,'-C',backend,'.']);
const appArchiveSha256=createHash('sha256').update(readFileSync(archive)).digest('hex');
mkdirSync(site+'/bootstrap',{recursive:true});copyFileSync(archive,site+'/bootstrap/'+appArchiveSha256+'.tgz');
const report={base,site,appArchiveSha256,appArchiveUrl:'https://midnight.vote/Switzerland/bootstrap/'+appArchiveSha256+'.tgz',dataUpdate:false};
writeFileSync(base+'/release.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));

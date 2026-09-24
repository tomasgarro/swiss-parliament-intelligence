import test from 'node:test';import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {findPreparedAnswer,preparedKey,servePrepared,PREPARED_FILE} from '../prepared-answers.mjs';
const root=mkdtempSync(join(tmpdir(),'prepared-'));mkdirSync(join(root,'data/parliament'),{recursive:true});
const entry={question:'What were the arguments in Parliament on “Wolves”?',language:'en',businessId:'20254464',personId:'',preparedAt:'2026-09-24T16:00:00.000Z',model:'nvidia/nvidia-nemotron-nano-9b-v2',answer:{status:'ok',mode:'live-inference',answer:'Arguments [1].',citations:[{n:1}]}};
writeFileSync(join(root,PREPARED_FILE),JSON.stringify({answers:[entry,{...entry,businessId:'1',answer:{status:'insufficient-evidence'}}]}));
test('a first question in the same scope and language matches despite case, spacing and final punctuation',()=>{
 assert.ok(findPreparedAnswer(root,{question:'what were the arguments in parliament on  “Wolves” ',language:'en',businessId:'20254464'}));
 assert.equal(preparedKey({question:'A?',language:'fr'}),preparedKey({question:'a',language:'fr'}));});
test('another language, scope, a follow-up, a filter or the off switch never match',()=>{
 const b={question:entry.question,language:'en',businessId:'20254464'};
 assert.equal(findPreparedAnswer(root,{...b,language:'fr'}),null);
 assert.equal(findPreparedAnswer(root,{...b,businessId:undefined}),null);
 assert.equal(findPreparedAnswer(root,{...b,thread:[{role:'user',content:'x'}]}),null);
 assert.equal(findPreparedAnswer(root,{...b,filters:{session:'5215'}}),null);
 assert.equal(findPreparedAnswer(root,b,{PREPARED_ANSWERS:'off'}),null);});
test('only verified answers are loaded',()=>{assert.equal(findPreparedAnswer(root,{question:entry.question,language:'en',businessId:'1'}),null);});
test('a served answer is labelled with when and by which model it was prepared',()=>{
 const out=servePrepared(entry);assert.equal(out.mode,'prepared');assert.equal(out.preparedAt,entry.preparedAt);assert.equal(out.preparedModel,entry.model);assert.match(out.notice,/Prepared answer/);assert.deepEqual(out.citations,[{n:1}]);});

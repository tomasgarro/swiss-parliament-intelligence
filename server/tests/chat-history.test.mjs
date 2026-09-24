import test from 'node:test';
import assert from 'node:assert/strict';
import {loadConversations,saveConversations,appendMessage,STORED_PASSAGE_CHARS} from '../../frontend/src/pilot/chat-history.mjs';
test('a late answer goes to its originating chat and survives storage',()=>{
 const rows=[{id:'new',messages:[]},{id:'old',messages:[{role:'user',text:'Question'}],scope:{id:'42',kind:'person'}}];
 const result=appendMessage(rows,'old',{role:'assistant',answer:{claims:[]}});
 assert.equal(result[0].messages.length,0);assert.equal(result[1].messages.length,2);
 let raw;const storage={getItem:()=>raw,setItem:(_,s)=>{raw=s;}};
 assert.equal(saveConversations(storage,result),true);assert.equal(loadConversations(storage)[0].scope.id,'42');
 assert.deepEqual(appendMessage([], 'deleted', {role:'assistant'}),[]);
 assert.deepEqual(loadConversations({getItem:()=>'{broken'}),[]);
 assert.equal(saveConversations({setItem:()=>{throw Error('quota');}},result),false);
});
test('stored answers keep their passages but cap each passage text; older full-length chats still load',()=>{
 const long='word '.repeat(1400),answer={status:'ok',claims:[{text:'Claim',evidenceId:'parl-1'}],passages:[{id:'1',speaker:'A',text:long},{id:'2',speaker:'B',text:'short'}]};
 const rows=[{id:'c',messages:[{role:'user',text:'Q'},{role:'assistant',answer}],updatedAt:'2026-09-24T00:00:00Z'}];
 let raw=JSON.stringify(rows);const storage={getItem:()=>raw,setItem:(_,s)=>{raw=s;}};
 assert.equal(loadConversations(storage)[0].messages[1].answer.passages[0].text,long);
 assert.equal(saveConversations(storage,rows),true);
 const [stored,kept]=loadConversations(storage)[0].messages[1].answer.passages;
 assert.ok(stored.text.length<=STORED_PASSAGE_CHARS+1&&stored.text.endsWith('…'));assert.equal(stored.speaker,'A');assert.equal(kept.text,'short');
 assert.equal(rows[0].messages[1].answer.passages[0].text,long,'the in-memory conversation is not trimmed');
});

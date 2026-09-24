export const CHAT_HISTORY_KEY='swiss-pilot-chats-v1';
// Passages are the bulk of a stored answer (up to 7,000 characters each). The source inspector reloads the full
// text of a transcript passage from the server, so the device copy keeps only enough to recognise it.
export const STORED_PASSAGE_CHARS=600;
export function newConversation(scope=null){return {id:globalThis.crypto.randomUUID(),scope,messages:[],updatedAt:new Date().toISOString()};}
export function loadConversations(storage){
 try{const rows=JSON.parse(storage.getItem(CHAT_HISTORY_KEY)||'[]');return Array.isArray(rows)?rows.filter(c=>typeof c.id==='string'&&Array.isArray(c.messages)).slice(0,20):[];}catch{return [];}
}
const trimPassage=p=>typeof p?.text==='string'&&p.text.length>STORED_PASSAGE_CHARS?{...p,text:p.text.slice(0,STORED_PASSAGE_CHARS).replace(/\s+\S*$/,'')+'…'}:p;
// Older stored chats have the same shape, so they load unchanged and are trimmed on their next save.
const storedMessage=m=>Array.isArray(m?.answer?.passages)?{...m,answer:{...m.answer,passages:m.answer.passages.map(trimPassage)}}:m;
export function saveConversations(storage,rows){
 try{storage.setItem(CHAT_HISTORY_KEY,JSON.stringify(rows.filter(c=>c.messages.length).slice(0,20).map(c=>({...c,messages:c.messages.slice(-40).map(storedMessage)}))));return true;}catch{return false;}
}
export function appendMessage(rows,id,message){return rows.map(c=>c.id===id?{...c,messages:[...c.messages,message].slice(-40),updatedAt:new Date().toISOString()}:c);}

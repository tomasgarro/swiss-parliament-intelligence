// In-app navigation used by chat, citations and cards; SwissPilot listens for civic-navigate.
export function openProfile(personId,tab){window.dispatchEvent(new CustomEvent('civic-navigate',{detail:'?view=profile&person='+encodeURIComponent(personId)+(tab?'&tab='+tab:'')}));}
// Vote Companion: the index (no id) or one vote object's page. Public, like the brief it shows.
export function openVotes(voteId){window.dispatchEvent(new CustomEvent('civic-navigate',{detail:'?view=votes'+(voteId?'&vote='+encodeURIComponent(voteId):'')}));}
export function openProposal(businessId){window.dispatchEvent(new CustomEvent('civic-navigate',{detail:'?view=parliament&business='+encodeURIComponent(businessId)}));}
// Opens Cleisthenes from anywhere with a scope and a question; autoSend sends it immediately.
export function askCleisthenes(context,options){window.dispatchEvent(new CustomEvent('civic-ask',{detail:{context,options}}));}
// 20250026 -> 25.026 (the number people see on parlament.ch)
export function businessNumber(id){const s=String(id||'');return /^[0-9]{8}$/.test(s)?`${s.slice(2,4)}.${s.slice(4).replace(/^0/,"")}`:s;}

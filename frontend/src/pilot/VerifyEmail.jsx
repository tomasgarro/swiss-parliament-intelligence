import React,{useState} from 'react';
import {EnvelopeSimpleOpen} from '@phosphor-icons/react';
import {pilotApi as api} from '../services/pilotApi.js';
import './account.css';

// Signed in, but the email address isn't confirmed yet. A sign-in link confirms it when opened.
export default function VerifyEmail({user,onUser}){
 const [busy,setBusy]=useState(false),[note,setNote]=useState('');
 async function resend(){setBusy(true);setNote('');try{await api.magic({email:user.email});setNote('Link sent. Open it in this browser within one hour.');}catch(e){setNote(e.message==='AUTH_RATE_LIMITED'?'Too many attempts. Please wait a few minutes and try again.':'The email could not be sent. Please try again.');}finally{setBusy(false);}}
 async function check(){setBusy(true);setNote('');try{const me=await api.me();onUser(me);if(!me.emailVerified)setNote('Your address isn’t confirmed yet. Open the link in the email, then try again.');}catch{onUser(null);}finally{setBusy(false);}}
 async function signOut(){setBusy(true);try{await api.logout();}finally{onUser(null);setBusy(false);}}
 return <div className="swiss-app verify-email-page"><div className="auth-panel account-refined account-confirmation" role="main">
  <img className="account-guide" src={import.meta.env.BASE_URL+'images/cleisthenes.png'} alt=""/>
  <EnvelopeSimpleOpen className="account-confirmation-icon" size={34} aria-hidden="true"/>
  <h2 id="account-title">Confirm your email to continue</h2>
  <p>Cleisthenes is open to verified accounts. Confirm <strong>{user.email}</strong> with the link we sent you.</p>
  <button className="account-submit" disabled={busy} onClick={check}>I’ve confirmed my email</button>
  <button className="account-text-button" disabled={busy} onClick={resend}>Send a new link</button>
  <button className="account-text-button" disabled={busy} onClick={signOut}>Sign out</button>
  <p className="account-confirmation-detail">Trouble signing in? Write to <a href="mailto:contact@midnight.vote">contact@midnight.vote</a>.</p>
  {note&&<p className="account-notice" role="status">{note}</p>}
 </div></div>;
}

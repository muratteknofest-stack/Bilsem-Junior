import { apiFetch } from '../../lib/api-fetch';
import React,{useEffect,useRef,useState} from 'react';
import {useAuth} from '../../contexts/AuthContext';
import {auth,db} from '../../lib/platform';
import {signInWithEmailAndPassword,signOut} from '../../lib/supabase';
import {doc,getDoc} from '../../lib/supabase-data';
import {isManagedStudentEmail,studentCodeToEmail} from '../../lib/account-identifiers';
import {cancelAccountSwitch} from '../../lib/account-switch';
import {registerFamilyInSupabase,resendFamilyConfirmation} from '../../services/family-registration-service';
import {apiUrl} from '../../lib/api-url';
import {strongPasswordSchema} from '../../lib/validations';
import type {UserProfile} from '../../types';
import {ENGLISH_QUESTIONS_PER_GRADE,englishQuestionCount} from './english-bank-spec';
import {englishAccountError} from './english-account-service';
export function EnglishAuth(){
 const {loginLocally,sendPasswordResetEmail}=useAuth();
 const [mode,setMode]=useState<'login'|'register'|'reset'>('login'),[role,setRole]=useState<'parent'|'student'>('parent'),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState(''),[confirmation,setConfirmation]=useState(false),[availability,setAvailability]=useState<{registrationOpen:boolean;policyVersion:string}|null>(null),[code,setCode]=useState('');
 const lock=useRef(false),alive=useRef(true),confirmationEmail=useRef('');
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{const controller=new AbortController();apiFetch(apiUrl('/api/public/platform'),{signal:controller.signal,cache:'no-store'}).then(async r=>{if(!r.ok)throw Error();const v=await r.json();if(typeof v.registrationOpen!=='boolean'||typeof v.policyVersion!=='string')throw Error();setAvailability(v);}).catch(()=>{if(!controller.signal.aborted)setError('Account availability could not load. Reload this page to retry.');});return()=>controller.abort();},[]);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();if(lock.current)return;const form=e.currentTarget;const f=new FormData(form);setError('');setNotice('');setConfirmation(false);lock.current=true;setBusy(true);let signedId:string|null=null;
 try{
 const identifier=String(f.get('identifier')||'').trim(),password=String(f.get('password')||'');
 if(mode==='reset'){if(!identifier.includes('@'))throw Error('Enter your parent email. Parents can reset a student password from the family dashboard.');try{localStorage.setItem('zekapark-preferred-language','en');}catch{}await sendPasswordResetEmail(identifier);if(alive.current)setNotice('If this email has an account, a recovery link will be sent. The recovery page offers English and Turkish.');}
 else if(mode==='register'){
 confirmationEmail.current=identifier;
 if(!availability?.registrationOpen)throw Error('New accounts are currently unavailable.');
 const studentPassword=String(f.get('studentPassword')||'');
 if(!strongPasswordSchema.safeParse(password).success||!strongPasswordSchema.safeParse(studentPassword).success)throw Error('Use 8–128 characters with a letter and a number for both passwords.');
 if(password!==f.get('passwordConfirm')||studentPassword!==f.get('studentPasswordConfirm'))throw Error('The repeated passwords must match.');
 if(password===studentPassword)throw Error('Use different parent and student passwords.');
 const result=await registerFamilyInSupabase({parentEmail:identifier,parentPassword:password,studentName:String(f.get('studentName')||'').trim(),studentPassword,grade:Number(f.get('grade')),examFocus:'Thinking skills',consentAccepted:f.get('privacy')==='on',termsAccepted:f.get('terms')==='on',guardianConfirmed:f.get('guardian')==='on',policyVersion:availability.policyVersion});
 if(alive.current){setCode(result.student.code);setNotice(result.verificationSent?'Your family account is ready. Confirm the parent email, sign in as a parent, and choose “Open student practice” once to enable student code sign-in. Save the student code below.':'Your family account was created, but the confirmation email could not be sent. Save the student code and request a new email below.');setConfirmation(true);form.reset();}
 }else{
 cancelAccountSwitch();const email=role==='student'&&!identifier.includes('@')?studentCodeToEmail(identifier):identifier;
 const credential=await signInWithEmailAndPassword(auth,email,password);signedId=credential.user.uid;
 if(!isManagedStudentEmail(credential.user.email)&&!credential.user.emailVerified)throw {code:'email_not_confirmed'};
 const snap=await getDoc(doc(db,'users',credential.user.uid));const profile=snap.exists()?snap.data() as UserProfile:null;
 if(!profile||profile.id!==credential.user.uid||profile.role!==role)throw Error('This account does not match the selected account type.');
 if(auth.currentUser?.uid!==credential.user.uid)return;
 // AuthProvider may finish loading and replace this form before this read returns.
 // A normal form unmount must not revoke the newly authenticated session.
 if(alive.current){loginLocally(profile);location.hash='account';}
 }
 }catch(err){if(signedId&&auth.currentUser?.uid===signedId)await signOut(auth).catch(()=>undefined);if(alive.current){setError((err as {code?:string}).code==='email_not_confirmed'&&role==='student'?'Ask your parent to confirm their email, sign in as a parent, and choose Open student practice once to enable your student code.':englishAccountError(err));if(role==='parent'&&(err as {code?:string}).code==='email_not_confirmed')setConfirmation(true);}}
 finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 async function resend(e:React.MouseEvent<HTMLButtonElement>){if(lock.current)return;const form=e.currentTarget.closest('form');const email=confirmationEmail.current||String(new FormData(form!).get('identifier')||'').trim();lock.current=true;setBusy(true);try{await resendFamilyConfirmation(email);if(alive.current)setNotice('If an eligible account exists, a confirmation email will be sent. Check your inbox and spam folder.');}catch(err){if(alive.current)setError(englishAccountError(err));}finally{lock.current=false;if(alive.current)setBusy(false);}}
 const change=(next:typeof mode)=>{setMode(next);setError('');setNotice('');setCode('');setConfirmation(false);};
 return <section className="en-section en-account-form"><p className="en-eyebrow">THINKHARBOR ACCOUNTS</p><h1>{mode==='register'?'Start your family’s thinking journey.':mode==='reset'?'Recover your parent account.':'Welcome back, curious minds.'}</h1><div className="en-actions"><button type="button" disabled={busy} className="en-secondary" onClick={()=>change('login')}>Sign in</button><button type="button" disabled={busy} className="en-secondary" onClick={()=>change('register')}>Create family account</button></div>
 <form onSubmit={submit}><fieldset disabled={busy||!!code}>
 {mode==='login'&&<label className="en-field">Account type<select value={role} onChange={e=>setRole(e.target.value as typeof role)}><option value="parent">Parent / guardian</option><option value="student">Student</option></select></label>}
 <label className="en-field">{mode==='login'&&role==='student'?'Student code':'Parent email'}<input name="identifier" type={mode==='login'&&role==='student'?'text':'email'} autoComplete={mode==='register'?'email':'username'} required maxLength={254}/></label>
 {mode!=='reset'&&<label className="en-field">{mode==='register'?'Parent password':'Password'}<input name="password" type="password" autoComplete={mode==='register'?'new-password':'current-password'} required maxLength={128} minLength={mode==='register'?8:1}/></label>}
 {mode==='register'&&<><p className="en-small">Both passwords: 8–128 characters, a letter and a number. Use different passwords. Avoid names and previously exposed passwords.</p><label className="en-field">Repeat parent password<input name="passwordConfirm" type="password" autoComplete="new-password" required/></label><label className="en-field">Student nickname<input name="studentName" minLength={2} maxLength={50} required autoComplete="off"/></label><label className="en-field">Practice level<select name="grade" required><option value="">Choose a level</option>{[1,2,3,4].map(n=><option key={n} value={n}>Level {n}</option>)}</select></label><p className="en-small">{englishQuestionCount(ENGLISH_QUESTIONS_PER_GRADE)} account puzzles are available at each level. These levels use the existing grades 1–4 question selection. They are not international grade equivalences or an intelligence assessment.</p><label className="en-field">Student password<input name="studentPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} required/></label><label className="en-field">Repeat student password<input name="studentPasswordConfirm" type="password" autoComplete="new-password" required/></label><label className="en-check"><input name="privacy" type="checkbox" required/>I have read the <a href="#privacy" target="_blank" rel="noopener">privacy notice</a>, including the account data described there.</label><label className="en-check"><input name="terms" type="checkbox" required/>I accept the <a href="#terms" target="_blank" rel="noopener">practice terms</a>.</label><label className="en-check"><input name="guardian" type="checkbox" required/>I am this child’s parent or legal guardian and authorise this account.</label></>}
 <button className="en-primary" disabled={mode==='register'&&!availability?.registrationOpen} type="submit">{busy?'Please wait…':mode==='register'?'Create family account':mode==='reset'?'Send recovery link':'Sign in'}</button></fieldset>
 {notice&&<p role="status" className="en-notice">{notice}</p>}{code&&<p className="en-notice">Student code: <strong>{code}</strong>. Keep it with the student password in a safe place. Students do not need a personal email.</p>}{error&&<p role="alert" className="en-notice">{error}</p>}
 {confirmation&&<button type="button" className="en-secondary" disabled={busy} onClick={resend}>Resend confirmation email</button>}
 </form><p><button className="en-text-button" disabled={busy} type="button" onClick={()=>change('reset')}>Forgot password?</button></p><p>Already use BİLSEM Junior? The same parent email or student code works here. Accounts share progress across languages.</p></section>;
}

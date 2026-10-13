import React,{useEffect,useRef,useState} from 'react';
import {z} from 'zod';
import {auth} from '../../lib/platform';
import {authenticatedFetch} from '../../lib/api-client';
import {withRequestDeadline} from '../../lib/request-deadline';
import {englishAccountError} from './english-account-model';

const requestSchema=z.object({id:z.string().uuid(),kind:z.enum(['question','deletion']),status:z.enum(['open','reviewing','resolved','dismissed']),created_at:z.string(),updated_at:z.string()});
const requestsSchema=z.object({requests:z.array(requestSchema).max(50)});
type AccountRequest=z.infer<typeof requestSchema>;
const statuses={open:'Received',reviewing:'Under review',resolved:'Resolved',dismissed:'Closed'};

export function EnglishAccountData({ownerId}:{ownerId:string}){
 const [requests,setRequests]=useState<AccountRequest[]>([]),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const alive=useRef(true),lock=useRef(false),controllers=useRef(new Set<AbortController>());
 const current=()=>alive.current&&auth.currentUser?.uid===ownerId;
 async function request(path:string,options:RequestInit={}){
  const controller=new AbortController();controllers.current.add(controller);
  try{return await withRequestDeadline(async deadline=>{
   const abort=()=>controller.abort();deadline.addEventListener('abort',abort,{once:true});
   try{const response=await authenticatedFetch(`/api/account/${path}`,{...options,signal:controller.signal,cache:'no-store'});if(!response.ok){const e=Error(response.status===429?'Too many attempts. Please wait before trying again.':'Account data could not load. Please try again.');throw e;}return await response.json();}
   finally{deadline.removeEventListener('abort',abort);}
  },45_000);}finally{controllers.current.delete(controller);}
 }
 async function refresh(){const data=requestsSchema.parse(await request('requests'));if(current())setRequests(data.requests);}
 useEffect(()=>{let active=true;alive.current=true;void refresh().catch(e=>{if(active&&current())setError(englishAccountError(e));});return()=>{active=false;alive.current=false;for(const c of controllers.current)c.abort();};},[ownerId]);
 async function action(job:()=>Promise<void>){if(lock.current)return;lock.current=true;setBusy(true);setError('');setMessage('');try{await job();}catch(e){if(current())setError(englishAccountError(e));}finally{lock.current=false;if(current())setBusy(false);}}
 const pending=requests.some(r=>r.kind==='deletion'&&(r.status==='open'||r.status==='reviewing'));
 return <details className="en-review"><summary>Family account data</summary><h2>Your data, together</h2><p>Download your profile, linked students, progress and saved study sessions as a JSON file. Keep the file private: it contains personal account information.</p>
 <div className="en-actions"><button type="button" className="en-secondary" disabled={busy} onClick={()=>void action(async()=>{
  const data=await request('export');if(!current())return;
  const parsed=z.object({format:z.literal('zekapark-account-export-v1'),profiles:z.array(z.object({id:z.string()})).min(1)}).safeParse(data);
  if(!parsed.success||parsed.data.profiles[0].id!==ownerId)throw Error('Account data could not be verified. Please try again.');
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='thinkharbor-family-data.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Your account data download is ready.');
 })}>Download account data</button><button type="button" className="en-secondary" disabled={busy} onClick={()=>void action(refresh)}>Refresh request status</button></div>
 <h3>Request family account deletion</h3><p>This submits a request for review covering your parent account and linked students. It does not immediately delete accounts. Support will review the data and any retention requirements before completing deletion. For questions, contact zeka.kupu.test@gmail.com.</p>
 <label className="en-check"><input type="checkbox" checked={confirmed} disabled={busy||pending} onChange={e=>setConfirmed(e.target.checked)}/> I request deletion of my family account and linked student data.</label>
 <button type="button" className="en-secondary" disabled={busy||!confirmed||pending} onClick={()=>void action(async()=>{
  const data=z.object({id:z.string().uuid()}).parse(await request('deletion-request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({confirmed:true})}));
  if(!current())return;setConfirmed(false);setRequests(rows=>[{id:data.id,kind:'deletion' as const,status:'open' as const,created_at:new Date().toISOString(),updated_at:new Date().toISOString()},...rows.filter(r=>r.id!==data.id)].slice(0,50));setMessage('Deletion request received. Your account remains active while the request is reviewed.');
 })}>Send deletion request</button>
 {busy&&<p role="status">Processing account data…</p>}{message&&<p role="status">{message}</p>}{error&&<p role="alert" className="en-notice">{error}</p>}
 <h3>Recent support requests</h3>{!requests.length&&<p>No recent requests. Use “Refresh request status” to check again.</p>}<ul className="en-history">{requests.map(r=><li key={r.id}><strong>{r.kind==='deletion'?'Account deletion':'Puzzle report'} · {statuses[r.status]}</strong><span>{new Date(r.created_at).toLocaleDateString('en-GB')} · Reference: {r.id}</span></li>)}</ul>
 </details>;
}

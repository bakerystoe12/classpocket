'use client';
import {useEffect,useState} from 'react';
import {Repeat2,ArrowLeft,ArrowUpRight} from 'lucide-react';
import type {Gizmo} from '@/lib/gizmos';
import {creatorRequest} from './CreatorStudio';
import {call} from './client';
import GizmoCanvas from './GizmoCanvas';
import ShareCard from './ShareCard';
import './creator.css';
type Shared={gizmo:Gizmo;version:number;visibility:string;owned:boolean;lineage:null|{creator:string;title:string;parent_token?:string}};
export default function SharedGizmo({token}:{token:string}){
 const [shared,setShared]=useState<Shared|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[needsName,setNeedsName]=useState(false),[name,setName]=useState(''),[url,setUrl]=useState('');
 useEffect(()=>{setUrl(window.location.href.split('?')[0]);creatorRequest(undefined,token).then(setShared).catch(e=>setError(e.message));},[token]);
 async function remix(){setBusy(true);setError('');try{const s=await creatorRequest();if(s.profile.name==='You'&&!needsName){setNeedsName(true);return;}if(s.profile.name==='You'){if(!name.trim())throw new Error('Choose a display name first.');await call('/api/social',{action:'profile',profile:{...s.profile,name:name.trim()}});}const result=await creatorRequest({action:'remix',token});window.location.href=(shared?.gizmo.program?'/studio?draft=':'/make?draft=')+encodeURIComponent(result.id);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <main className="creator-page"><header className="creator-page-header"><a href="/"><ArrowLeft size={17}/>ClassPocket</a><a href="/make">Create your own<ArrowUpRight size={17}/></a></header>{error&&<p className="creator-error" role="alert">{error}</p>}{shared?<><div className="shared-heading"><span className="creator-kicker">{shared.visibility==='public'?'LIVE SHOWCASE':'SHARED BY LINK'} · SAVED VERSION {shared.version}</span><h1>{shared.gizmo.title}</h1><p>{shared.gizmo.creatorName||'@'+shared.gizmo.creator} · {shared.gizmo.subject}</p><p>{shared.gizmo.caption}</p></div><GizmoCanvas gizmo={shared.gizmo} active/><div className="shared-remix"><h2>What would you change?</h2><p>Take your own copy. Change the interaction, the look or the challenge. The original stays exactly as it is.</p>{needsName&&<label>Your display name<input aria-label="Remix display name" value={name} onChange={e=>setName(e.target.value)} maxLength={40} placeholder="Your creator name"/></label>}<button className="creator-primary" disabled={busy||needsName&&!name.trim()} onClick={()=>void remix()}><Repeat2 size={18}/>{busy?'Making your copy…':needsName?'Create my remix':'Remix this gizmo'}</button>{needsName&&<small>Your guest identity stays in this browser. No cross-device recovery is configured.</small>}<p className="creator-attribution">{shared.gizmo.attribution}</p>{shared.lineage?.parent_token?<a href={'/g/'+shared.lineage.parent_token}>Remixed from {shared.lineage.title} by @{shared.lineage.creator}</a>:shared.lineage&&<p>Remixed from a private source by @{shared.lineage.creator}</p>}</div>{url&&<ShareCard url={url} title={shared.gizmo.title}/>}</>:!error&&<p role="status">Opening this little world…</p>}</main>;
}

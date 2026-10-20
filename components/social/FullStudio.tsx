'use client';
import {useEffect,useState} from 'react';
import Builder,{type DraftResponse} from './Builder';
import {call,ensureGuest} from './client';
import {customTemplate} from '@/lib/gizmos';
import ShareCard from './ShareCard';
import './social.css';
import './creator.css';
type AI={provider:string;model:string;custom?:boolean}|null;
const fresh=():DraftResponse=>({draft:{...customTemplate,id:'',version:0,owned:true,authored:false,provenance:{kind:'template',reviewed:false}},versions:[],publishedVersion:null});
export default function FullStudio(){
 const [initial,setInitial]=useState<DraftResponse|null>(null),[key,setKey]=useState(0),[backend,setBackend]=useState(false),[ai,setAI]=useState<AI>(null),[notice,setNotice]=useState(''),[error,setError]=useState(''),[link,setLink]=useState(''),[projects,setProjects]=useState<{id:string;title:string;version:number}[]>([]),[sharing,setSharing]=useState(false);
 const list=async()=>{const me=await call<{projects:typeof projects}>('/api/social');setProjects(me.projects);};
 useEffect(()=>{let live=true;void(async()=>{try{
  const session=await call<{configured:{backend:boolean}}>('/api/session');if(!live)return;setBackend(session.configured.backend);
  const config=await call<{ai:AI}>('/api/studio');if(!live)return;setAI(config.ai);
  if(session.configured.backend){await ensureGuest();const id=new URLSearchParams(window.location.search).get('draft');const d=id?await call<DraftResponse>('/api/social?draft='+encodeURIComponent(id)):fresh();if(!live)return;setInitial(d);await list();}
  else setInitial(fresh());
 }catch(e){if(live){setError((e as Error).message);setInitial(fresh());}}})();return()=>{live=false;};},[]);
 const open=async(id:string)=>{setError('');try{const d=await call<DraftResponse>('/api/social?draft='+encodeURIComponent(id));setInitial(d);setKey(k=>k+1);setLink('');history.replaceState(null,'','/studio?draft='+encodeURIComponent(id));}catch(e){setError((e as Error).message);}};
 const share=async()=>{if(!initial?.draft.id)return;setSharing(true);setError('');try{const result=await call<{path:string}>('/api/creator',{action:'share',post:initial.draft.id,version:initial.draft.version,visibility:'private'});setLink(window.location.origin+result.path);setNotice('Saved-version link ready. Anyone with the link can play and remix this snapshot.');}catch(e){setError((e as Error).message);}finally{setSharing(false);}};
 return <main className="social-app full-studio-page"><header><a href="/">← ClassPocket</a><a href="/make">Template experiments</a></header><div className="full-studio-heading"><span className="social-kicker">STUDIO</span><h1>What will you make?</h1><p>Describe a game, simulation, story, instrument or creative toy. Play it, change it and make it yours.</p></div>
  {error&&<p className="social-inline-error" role="alert">{error}</p>}{notice&&<p className="creator-notice" role="status">{notice}</p>}
  {!backend&&initial&&<p className="builder-ai-off">The database is not configured. You can play the starter, but creation, saving and sharing need Supabase.</p>}
  {initial?<Builder key={key} initial={initial} backend={backend} ai={ai} onChange={d=>{setInitial(d);setLink('');if(backend)void list().catch(()=>{});if(d.draft.id)history.replaceState(null,'','/studio?draft='+encodeURIComponent(d.draft.id));}} onPublished={()=>{setNotice('Published. Open Home to find your gizmo in the feed.');void list().catch(()=>{});}} notify={setNotice}/>:<p role="status">Opening Studio…</p>}
  {initial?.draft.id&&<div className="full-studio-share"><button className="social-white-button" disabled={sharing} onClick={()=>void share()}>{sharing?'Making link…':`Share saved version ${initial.draft.version}`}</button><small>Sharing creates a snapshot of the saved version. Unsaved changes stay in the editor.</small></div>}
  {link&&initial&&<ShareCard url={link} title={initial.draft.title}/>}
  <section className="full-studio-projects"><div className="social-section-heading"><h2>Your projects</h2><button className="social-dark-button" onClick={()=>{setInitial(fresh());setKey(k=>k+1);setLink('');setNotice('');history.replaceState(null,'','/studio');}}>New gizmo</button></div>{projects.length>0?<div className="social-project-list">{projects.map(p=><button key={p.id} className="social-project-row" onClick={()=>void open(p.id)}><strong>{p.title}</strong><span>Version {p.version}</span></button>)}</div>:<p>Your saved projects will appear here.</p>}</section>
 </main>;
}

'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {programDocument,type CustomProgram} from '@/lib/custom-program';
export default function GeneratedGizmo({program,title,active,small,onRuntimeError}:{program:CustomProgram;title:string;active:boolean;small:boolean;onRuntimeError?:(message:string)=>void}){
 const frame=useRef<HTMLIFrameElement>(null),callback=useRef(onRuntimeError);callback.current=onRuntimeError;
 const [channel,setChannel]=useState(''),[nonce,setNonce]=useState(''),[restart,setRestart]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState(''),[stopped,setStopped]=useState(false);
 useEffect(()=>{setChannel(crypto.randomUUID());setNonce(crypto.randomUUID().replace(/-/g,''));setReady(false);setError('');setStopped(false);callback.current?.('');},[program,restart]);
 const doc=useMemo(()=>channel&&nonce?programDocument(program,channel,title,nonce):'',[program,channel,nonce,title]);
 useEffect(()=>{if(!active||small||!channel)return;const receive=(event:MessageEvent)=>{
  if(event.source!==frame.current?.contentWindow||event.origin!=='null'||event.data?.classpocket!==channel)return;
  if(event.data.type==='error'&&typeof event.data.message==='string'){const message=event.data.message.slice(0,800);setError(message);callback.current?.(message);}
  if(event.data.type==='ready')setReady(true);
 };window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[active,small,channel]);
 useEffect(()=>{if(!active||small||!doc)return;const timer=setTimeout(()=>{if(!ready){setStopped(true);const message='The gizmo did not start. Simplify it or ask Claude to repair it.';setError(message);callback.current?.(message);}},10000);return()=>clearTimeout(timer);},[doc,active,small,ready]);
 if(small||!active)return <div className="generated-gizmo-poster"><span>Custom gizmo</span><strong>{title}</strong><small>{small?'Interactive creation':'Scroll here to play'}</small></div>;
 return <div className="generated-gizmo" data-engine="custom"><div className="generated-gizmo-bar"><span>Custom interactive gizmo · AI content is unreviewed</span><button aria-label={`Restart ${title}`} onClick={()=>setRestart(n=>n+1)}>Restart</button><button onClick={()=>setStopped(s=>!s)}>{stopped?'Play gizmo':'Stop gizmo'}</button></div>
  {!stopped&&doc&&<iframe ref={frame} title={`${title} — isolated gizmo`} sandbox="allow-scripts" allow="camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'; payment 'none'; fullscreen 'none'" referrerPolicy="no-referrer" srcDoc={doc}/>}
  {error&&<p className="social-inline-error" role="alert">This gizmo needs a repair: {error}</p>}
  {!ready&&!stopped&&<p role="status">Starting your gizmo…</p>}
 </div>;
}

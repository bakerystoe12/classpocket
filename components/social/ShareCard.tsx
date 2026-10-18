'use client';
import {useEffect,useState} from 'react';
import {Copy,Send} from 'lucide-react';
export default function ShareCard({url,title}:{url:string;title:string}){
 const [qr,setQr]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{let live=true;void import('qrcode').then(m=>m.toDataURL(url,{width:220,margin:2,color:{dark:'#101015',light:'#ffffff'}})).then(v=>live&&setQr(v)).catch(()=>{});return()=>{live=false;};},[url]);
 async function copy(){try{await navigator.clipboard.writeText(url);setMessage('Link copied. Open it on another phone to play and remix.');}catch{setMessage('Select the link above and copy it manually.');}}
 return <div className="creator-share-card"><div><strong>Your gizmo is ready to travel.</strong><p>Scan, play, then make your own remix.</p><label>Share link<input aria-label="Gizmo snapshot link" value={url} readOnly onFocus={e=>e.target.select()}/></label><div><button onClick={()=>void copy()}><Copy size={16}/>Copy link</button><button onClick={async()=>{try{if(navigator.share)await navigator.share({title,url});else await copy();}catch(e){if((e as Error).name!=='AbortError')setMessage('Sharing unavailable. Copy the link instead.');}}}><Send size={16}/>Share</button></div><p role="status">{message}</p></div>{qr&&<img src={qr} width="160" height="160" alt="QR code to this saved gizmo version"/>}</div>;
}

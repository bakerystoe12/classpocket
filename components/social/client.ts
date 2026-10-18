'use client';
export class ApiError extends Error{constructor(message:string,public status:number,public code:string,public data:Record<string,unknown>){super(message);}}
// JSON-only API calls; mutations are same-origin POSTs so the server's origin check passes.
export async function call<T=Record<string,unknown>>(path:string,body?:unknown,method?:string):Promise<T>{
 const res=await fetch(path,{method:method||(body===undefined?'GET':'POST'),headers:body===undefined?undefined:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
 const data=await res.json().catch(()=>({error:'The server sent an unreadable response.'}));
 if(!res.ok)throw new ApiError(data.error||'Request failed.',res.status,data.code||'error',data);
 return data as T;
}
let guest:Promise<void>|null=null;
// Pages outside the main feed (topic sessions, classroom) start a guest identity on first use.
export function ensureGuest(){guest??=(async()=>{const s=await call<{configured:{backend:boolean};user:unknown}>('/api/session');if(s.configured.backend&&!s.user)await call('/api/session',{action:'guest'});})().catch(e=>{guest=null;throw e;});return guest;}

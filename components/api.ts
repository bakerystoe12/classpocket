import {ensureGuest} from './social/client';
export async function api(path:string,body?:unknown,method?:string){await ensureGuest();const res=await fetch(`/api/${path}`,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});const data=await res.json();if(!res.ok)throw new Error(data.error||'Request failed.');return data;}

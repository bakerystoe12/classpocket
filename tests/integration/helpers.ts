import {existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {createClient,type SupabaseClient} from '@supabase/supabase-js';
for(const f of ['.env.local','.env'])if(existsSync(f))process.loadEnvFile(f);
export const BASE=process.env.TEST_BASE_URL||'http://localhost:3000';
export const SUPABASE_URL=process.env.NEXT_PUBLIC_SUPABASE_URL!,PUBLISHABLE=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,SECRET=process.env.SUPABASE_SECRET_KEY!;
export const admin=()=>createClient(SUPABASE_URL,SECRET,{auth:{persistSession:false,autoRefreshToken:false}});
export const anonClient=()=>createClient(SUPABASE_URL,PUBLISHABLE,{auth:{persistSession:false,autoRefreshToken:false}});
export async function guestClient(){const c=anonClient();const {data,error}=await c.auth.signInAnonymously();if(error)throw error;return {client:c,id:data.user!.id};}
export async function teacherAccount(){
 const email=`teacher-${randomBytes(4).toString('hex')}@example.test`,password=randomBytes(12).toString('base64url');const a=admin();
 const {data,error}=await a.auth.admin.createUser({email,password,email_confirm:true});if(error)throw error;
 const {error:e2}=await a.from('user_roles').insert({user_id:data.user.id,role:'teacher'});if(e2)throw e2;return {email,password,id:data.user.id};
}
export async function teacherClient(){const t=await teacherAccount();const c=anonClient();const {error}=await c.auth.signInWithPassword({email:t.email,password:t.password});if(error)throw error;return {client:c,...t};}
// A cookie-jar HTTP client that behaves like one browser profile talking to the deployed app.
export class Browser{
 cookies=new Map<string,string>();
 constructor(public base=BASE){}
 private store(res:Response){for(const c of res.headers.getSetCookie()){const [pair,...attrs]=c.split(';');const i=pair.indexOf('=');const name=pair.slice(0,i).trim(),value=pair.slice(i+1);if(/max-age=0/i.test(attrs.join(';'))||value==='')this.cookies.delete(name);else this.cookies.set(name,value);}}
 async req(path:string,{method='GET',body,origin=this.base,headers={}}:{method?:string;body?:unknown;origin?:string|null;headers?:Record<string,string>}={}){
  const h:Record<string,string>={...headers,cookie:[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; ')};if(body!==undefined)h['content-type']='application/json';if(origin&&method!=='GET')h.origin=origin;
  const res=await fetch(this.base+path,{method,headers:h,body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'});this.store(res);
  const data=await res.json().catch(()=>null);return {status:res.status,data,headers:res.headers};
 }
 get(path:string){return this.req(path);}
 post(path:string,body:unknown,origin?:string|null){return this.req(path,{method:'POST',body,origin});}
 async guest(){const r=await this.post('/api/session',{action:'guest'});if(r.status!==200)throw new Error(`guest failed ${r.status} ${JSON.stringify(r.data)}`);return r.data.user.id as string;}
 async signIn(email:string,password:string){const r=await this.post('/api/session',{action:'sign-in',email,password});if(r.status!==200)throw new Error(`sign-in failed ${JSON.stringify(r.data)}`);return r.data.user;}
}
export const uuid=()=>crypto.randomUUID();
// A small text PDF with optional padding (an unused binary stream) to exceed the 4.5 MB function body limit.
export function makePdf(lines:string[][],padBytes=0){
 const objs:string[]=[];const add=(s:string)=>{objs.push(s);return objs.length;};
 const font=add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
 const pagesId=objs.length+1;add('PAGES');const kids:number[]=[];
 for(const page of lines){const content=`BT /F1 12 Tf 14 TL 72 740 Td ${page.map(l=>`(${l.replace(/[()\\]/g,'\\$&')}) Tj T*`).join(' ')} ET`;const c=add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${c} 0 R >>`));}
 objs[pagesId-1]=`<< /Type /Pages /Kids [${kids.map(k=>`${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
 const catalog=add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
 const chunks:Buffer[]=[Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n','latin1')];const offsets:number[]=[];let len=chunks[0].length;
 const push=(b:Buffer)=>{chunks.push(b);len+=b.length;};
 objs.forEach((o,i)=>{offsets.push(len);push(Buffer.from(`${i+1} 0 obj\n${o}\nendobj\n`,'latin1'));});
 if(padBytes){offsets.push(len);const pad=randomBytes(padBytes);push(Buffer.from(`${objs.length+1} 0 obj\n<< /Length ${pad.length} >>\nstream\n`,'latin1'));push(pad);push(Buffer.from('\nendstream\nendobj\n','latin1'));}
 const count=offsets.length+1,xref=len;
 push(Buffer.from(`xref\n0 ${count}\n0000000000 65535 f \n${offsets.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')}trailer\n<< /Size ${count} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`,'latin1'));
 return Buffer.concat(chunks);
}
export type Client=SupabaseClient;

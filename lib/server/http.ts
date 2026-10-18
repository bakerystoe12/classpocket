import 'server-only';
import {NextResponse,type NextRequest} from 'next/server';
import {ZodError} from 'zod';
import {allowedOrigins} from '@/lib/env';
import {DefinitionError} from '@/lib/gizmo-spec';
export class HttpError extends Error{constructor(public status:number,message:string,public code='error',public extra:Record<string,unknown>={}){super(message);}}
export const json=(data:unknown,status=200,headers:Record<string,string>={})=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store',...headers}});
// Postgres/PostgREST error codes raised by our functions and constraints.
const pgStatus:Record<string,number>={'42501':403,'28000':401,'40001':409,'P0002':404,'23505':409,'22023':400,'23514':400,'23503':404,'22P02':400,'PGRST116':404};
type PgError={code?:string;message?:string;details?:string};
export function fromPg(e:PgError|null|undefined,fallback='The database rejected this request.'):never{
 const code=e?.code||'';const status=pgStatus[code]||500;
 if(status===500)console.error('Database error',code,e?.message?.slice(0,200));
 if(code==='23505')throw new HttpError(409,/handle/i.test(e?.message||'')?'That username is already taken.':'That already exists.','conflict');
 if(code==='23514')throw new HttpError(400,'Some values are outside the allowed limits.','invalid');
 throw new HttpError(status,status===500?fallback:(e?.message||fallback),code||'db');
}
// Shared validators (timetables, lessons) throw plain Errors with user-facing messages; those are client errors.
export function invalid<T>(fn:()=>T):T{try{return fn();}catch(e){if(e instanceof ZodError||e instanceof HttpError||e instanceof DefinitionError)throw e;throw new HttpError(400,e instanceof Error?e.message:'Invalid input.','invalid');}}
export function sameOrigin(req:NextRequest){
 const origin=req.headers.get('origin');if(!origin)throw new HttpError(403,'Missing request origin.','origin');
 const allowed=allowedOrigins();if(allowed.has(origin))return;
 // Same-origin fallback for local or not-yet-configured deployments: compare with the URL Next.js served.
 if(origin===req.nextUrl.origin&&!process.env.APP_URL)return;
 throw new HttpError(403,'Origin not allowed.','origin');
}
export async function readJson(req:NextRequest){if(!req.headers.get('content-type')?.includes('application/json'))throw new HttpError(415,'Send JSON.','content-type');try{return await req.json() as Record<string,unknown>;}catch{throw new HttpError(400,'Malformed JSON.','json');}}
export function route<T extends unknown[]>(fn:(req:NextRequest,...rest:T)=>Promise<Response>){
 return async(req:NextRequest,...rest:T)=>{try{if(req.method!=='GET'&&req.method!=='HEAD')sameOrigin(req);return await fn(req,...rest);}catch(e){return errorResponse(e);}};
}
export function errorResponse(e:unknown){
 if(e instanceof HttpError)return json({error:e.message,code:e.code,...e.extra},e.status,e.status===429&&typeof e.extra.retryAfter==='number'?{'Retry-After':String(e.extra.retryAfter)}:{});
 if(e instanceof DefinitionError)return json({error:e.message,code:'invalid-definition',issues:e.issues},400);
 if(e instanceof ZodError)return json({error:e.issues.slice(0,5).map(i=>`${i.path.join('.')||'input'}: ${i.message}`).join('; '),code:'invalid'},400);
 console.error('Unhandled route error',e instanceof Error?e.message.slice(0,300):'unknown');
 return json({error:'Something went wrong on the server. Nothing was saved.',code:'server'},500);
}

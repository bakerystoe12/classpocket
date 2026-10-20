import 'server-only';
import type {AiConfig} from '@/lib/env';
import {structured as groqStructured,type ProviderResult} from './groq';
export type StructuredInput={system:string;user:string;name:string;schema:object;fetcher?:typeof fetch};
// API credentials remain on the server. No automatic transport retries or raw provider errors.
export async function structured(cfg:AiConfig,input:StructuredInput):Promise<ProviderResult>{
 if(cfg.provider!=='anthropic')return groqStructured(cfg,input);
 const usage={input:0,output:0};let response:Response;
 try{response=await (input.fetcher||fetch)(`${cfg.baseUrl}/messages`,{
  method:'POST',signal:AbortSignal.timeout(cfg.timeoutMs),headers:{'Content-Type':'application/json','x-api-key':cfg.apiKey,'anthropic-version':'2023-06-01'},
  body:JSON.stringify({model:cfg.model,max_tokens:cfg.maxOutputTokens,system:input.system,messages:[{role:'user',content:input.user}],thinking:{type:'adaptive'},output_config:{effort:'medium',format:{type:'json_schema',schema:input.schema}}})
 });}catch(e){const timeout=e instanceof Error&&['TimeoutError','AbortError'].includes(e.name);return {ok:false,code:timeout?'timeout':'provider',message:timeout?'Claude took too long to answer. Your previous draft is unchanged.':'Claude could not be reached. Try again later.'};}
 if(response.status===429||response.status===529){const retry=Number(response.headers.get('retry-after'));return {ok:false,code:'rate-limited',message:'Claude is busy or at its usage limit. Try again later.',retryAfter:Number.isFinite(retry)&&retry>0?Math.min(3600,Math.ceil(retry)):60};}
 if(!response.ok)return {ok:false,code:'provider',message:response.status===401||response.status===403?'Claude access is not configured correctly. Ask the operator to check the API key and billing.':response.status===404?'The configured Claude model is unavailable. Ask the operator to check ANTHROPIC_MODEL.':`Claude could not complete this request (${response.status}).`};
 const body=await response.json().catch(()=>null) as {stop_reason?:string;content?:{type:string;text?:string}[];usage?:{input_tokens?:number;output_tokens?:number}}|null;
 usage.input=body?.usage?.input_tokens||0;usage.output=body?.usage?.output_tokens||0;
 if(body?.stop_reason==='refusal')return {ok:false,code:'refused',message:'Claude declined that request.',usage};
 if(body?.stop_reason==='max_tokens')return {ok:false,code:'incomplete',message:'Claude reached the generation limit. Try a smaller gizmo or a simpler edit.',usage};
 if(body?.stop_reason!=='end_turn')return {ok:false,code:'incomplete',message:'Claude did not finish this gizmo.',usage};
 try{return {ok:true,json:JSON.parse((body.content||[]).filter(b=>b.type==='text').map(b=>b.text||'').join('')),usage};}
 catch{return {ok:false,code:'invalid-json',message:'Claude returned an unreadable draft. Try again with a simpler request.',usage};}
}

import 'server-only';
import type {AiConfig} from '@/lib/env';
// Minimal client for Groq's OpenAI-compatible chat completions with strict JSON-schema output.
// No automatic retries: callers decide on at most one repair attempt, and 429s surface to the user.
export type ProviderFailure={ok:false;code:'timeout'|'rate-limited'|'refused'|'incomplete'|'invalid-json'|'schema-rejected'|'provider';message:string;retryAfter?:number};
export type ProviderResult={ok:true;json:unknown;usage:{input:number;output:number}}|ProviderFailure;
export async function structured(cfg:AiConfig,{system,user,name,schema,strict=true,fetcher=fetch}:{system:string;user:string;name:string;schema:object;strict?:boolean;fetcher?:typeof fetch}):Promise<ProviderResult>{
 let res:Response;
 try{
  res=await fetcher(`${cfg.baseUrl}/chat/completions`,{method:'POST',signal:AbortSignal.timeout(cfg.timeoutMs),headers:{'Content-Type':'application/json',Authorization:`Bearer ${cfg.apiKey}`},
   body:JSON.stringify({model:cfg.model,temperature:.3,max_completion_tokens:cfg.maxOutputTokens,messages:[{role:'system',content:system},{role:'user',content:user}],response_format:{type:'json_schema',json_schema:{name,strict,schema}}})});
 }catch(e){const timeout=e instanceof Error&&(e.name==='TimeoutError'||e.name==='AbortError');return {ok:false,code:timeout?'timeout':'provider',message:timeout?'The AI service took too long to answer.':'The AI service could not be reached.'};}
 if(res.status===429){const h=Number(res.headers.get('retry-after'));return {ok:false,code:'rate-limited',message:'The AI service is at its rate limit right now.',retryAfter:Number.isFinite(h)&&h>0?Math.ceil(h):60};}
 const body=await res.json().catch(()=>null) as {error?:{code?:string;message?:string};choices?:{finish_reason?:string;message?:{content?:string|null;refusal?:string|null}}[];usage?:{prompt_tokens?:number;completion_tokens?:number}}|null;
 if(!res.ok){
  if(res.status===400&&/json_validate_failed/.test(body?.error?.code||''))return {ok:false,code:'schema-rejected',message:'The AI answer did not match the required format.'};
  return {ok:false,code:'provider',message:`The AI service returned an error (${res.status}).`};
 }
 const choice=body?.choices?.[0];
 if(choice?.message?.refusal)return {ok:false,code:'refused',message:'The AI declined this request.'};
 if(choice?.finish_reason==='length')return {ok:false,code:'incomplete',message:'The AI answer was cut off before it finished.'};
 try{return {ok:true,json:JSON.parse(choice?.message?.content||''),usage:{input:body?.usage?.prompt_tokens||0,output:body?.usage?.completion_tokens||0}};}
 catch{return {ok:false,code:'invalid-json',message:'The AI answer was not valid JSON.'};}
}

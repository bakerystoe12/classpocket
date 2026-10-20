import 'server-only';
import {Script} from 'node:vm';
import type {AiConfig} from '@/lib/env';
import type {GizmoDefinition,Subject} from '@/lib/gizmo-spec';
import {structured} from './provider';
import {customSystemPrompt,customUserPrompt,customOutputSchema,toCustomDefinition} from './custom-gizmo';
type Usage={input:number;output:number};
type BuildInput={prompt:string;base:GizmoDefinition|null;subject:Subject|null;runtimeError?:string;fetcher?:typeof fetch};
export type CustomBuildResult={ok:true;definition:GizmoDefinition;summary:string;unsupported:string[];usage:Usage;repaired:boolean}|{ok:false;status:number;code:string;message:string;usage:Usage;retryAfter?:number};
// At most two provider calls. Compilation checks syntax ONLY; generated code is never run on the server.
export async function buildCustom(cfg:AiConfig,input:BuildInput):Promise<CustomBuildResult>{
 const original=customUserPrompt(input.prompt,input.base,input.subject,input.runtimeError),usage={input:0,output:0};let user=original;
 for(let attempt=0;attempt<2;attempt++){
  const response=await structured(cfg,{system:customSystemPrompt,user,name:'custom_gizmo',schema:customOutputSchema,fetcher:input.fetcher});
  if(response.usage){usage.input+=response.usage.input;usage.output+=response.usage.output;}
  if(!response.ok){
   if(attempt===0&&['invalid-json','schema-rejected'].includes(response.code)){user=JSON.stringify({task:'Return valid JSON matching the supplied schema. Keep the original request.',original});continue;}
   return {ok:false,status:response.code==='rate-limited'?429:response.code==='timeout'?504:response.code==='refused'?422:502,code:response.code,message:response.message,usage,retryAfter:response.retryAfter};
  }
  try{
   const converted=toCustomDefinition(response.json,input);
   if(!converted.ok)return {ok:false,status:422,code:'refused',message:converted.reason,usage};
   new Script(converted.definition.program!.javascript,{filename:'gizmo.js'});
   return {...converted,usage,repaired:attempt>0};
  }catch(e){
   const issue=e instanceof Error?e.message.slice(0,1800):'Invalid program.';
   if(attempt===0){user=JSON.stringify({task:'Repair your previous JSON and program to fix the validation or JavaScript syntax error. Preserve the original intent. Return the full corrected JSON.',original,issue,previous:response.json});continue;}
   return {ok:false,status:502,code:'invalid-output',message:'Claude’s gizmo did not pass the program checks after one repair. Try a smaller idea; your previous draft is unchanged.',usage};
  }
 }
 return {ok:false,status:502,code:'invalid-output',message:'No complete gizmo was produced.',usage};
}

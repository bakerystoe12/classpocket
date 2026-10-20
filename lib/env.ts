import {z} from 'zod';
// Configuration is read lazily at request time so `next build` never needs (or contacts) the backend.
// Nothing here logs secret values.
const optionalUrl=z.string().trim().url().optional().or(z.literal('').transform(()=>undefined));
const flag=(v:string|undefined,fallback:boolean)=>v===undefined||v===''?fallback:/^(1|true|yes|on)$/i.test(v);
const int=(v:string|undefined,fallback:number,min:number,max:number)=>{const n=Number(v);return Number.isFinite(n)&&v!==''&&v!==undefined?Math.min(max,Math.max(min,Math.round(n))):fallback;};
export type SupabaseConfig={url:string;publishableKey:string};
export function supabaseConfig():SupabaseConfig|null{
 const url=optionalUrl.safeParse(process.env.NEXT_PUBLIC_SUPABASE_URL),key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
 return url.success&&url.data&&key?{url:url.data.replace(/\/$/,''),publishableKey:key}:null;
}
export function secretKey(){const key=process.env.SUPABASE_SECRET_KEY?.trim();return key||null;}
export function backendReady(){return !!supabaseConfig()&&!!secretKey();}
export type AiConfig={provider?:'anthropic'|'groq';apiKey:string;model:string;baseUrl:string;timeoutMs:number;maxOutputTokens:number;userDaily:number;guestDaily:number;globalDaily:number;maxPromptChars:number};
export function aiConfig(providerOverride?:'groq'|'anthropic'):AiConfig|null{
 const provider=providerOverride||process.env.AI_PROVIDER?.trim()||(process.env.ANTHROPIC_API_KEY?.trim()?'anthropic':'groq');
 if(!['anthropic','groq'].includes(provider)||!flag(process.env.AI_ENABLED,true))return null;
 const claude=provider==='anthropic',apiKey=(claude?process.env.ANTHROPIC_API_KEY:process.env.GROQ_API_KEY)?.trim();if(!apiKey)return null;
 return {provider:provider as 'anthropic'|'groq',apiKey,model:(claude?process.env.ANTHROPIC_MODEL:process.env.GROQ_MODEL)?.trim()||(claude?'claude-sonnet-5-5':'openai/gpt-oss-20b'),baseUrl:claude?'https://api.anthropic.com/v1':(process.env.GROQ_BASE_URL?.trim()||'https://api.groq.com/openai/v1').replace(/\/$/,''),
  timeoutMs:int(process.env.AI_TIMEOUT_MS,claude?70000:25000,3000,claude?75000:55000),maxOutputTokens:int(process.env.AI_MAX_OUTPUT_TOKENS,claude?10000:2000,300,12000),
  userDaily:int(process.env.AI_USER_DAILY_LIMIT,20,0,1000),guestDaily:int(process.env.AI_GUEST_DAILY_LIMIT,5,0,1000),globalDaily:int(process.env.AI_GLOBAL_DAILY_LIMIT,300,0,100000),maxPromptChars:int(process.env.AI_MAX_PROMPT_CHARS,600,50,4000)};
}
export const demoMode=()=>flag(process.env.DEMO_MODE,false);
// Origins allowed to send cookie-authenticated mutations. Forwarded host headers are never trusted.
export function allowedOrigins(){
 const out=new Set<string>();const add=(v?:string)=>{if(!v)return;try{out.add(new URL(v.startsWith('http')?v:`https://${v}`).origin);}catch{}};
 add(process.env.APP_URL);add(process.env.VERCEL_URL);add(process.env.VERCEL_BRANCH_URL);add(process.env.VERCEL_PROJECT_PRODUCTION_URL);
 for(const o of (process.env.ALLOWED_ORIGINS||'').split(','))add(o.trim());
 if(process.env.NODE_ENV!=='production'){out.add('http://localhost:3000');out.add('http://127.0.0.1:3000');}
 return out;
}
export function appUrl(fallbackOrigin:string){const v=process.env.APP_URL?.trim();try{return v?new URL(v).origin:fallbackOrigin;}catch{return fallbackOrigin;}}

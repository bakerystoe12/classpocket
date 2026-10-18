import {json,route} from '@/lib/server/http';
import {aiConfig,backendReady} from '@/lib/env';
import {adminClient} from '@/lib/supabase/server';
export const runtime='nodejs';export const dynamic='force-dynamic';
// Deployment check: reports configuration and whether the database answers. Never returns secrets.
export const GET=route(async()=>{
 const out:{backend:boolean;ai:boolean;database:'ok'|'unconfigured'|'error';authoredPosts?:number;schema?:string}={backend:backendReady(),ai:!!aiConfig(),database:'unconfigured'};
 if(out.backend){const {count,error}=await adminClient().from('gizmos').select('id',{count:'exact',head:true}).eq('authored',true);out.database=error?'error':'ok';if(!error)out.authoredPosts=count??0;if(error)out.schema=error.code;}
 return json(out,out.database==='error'?503:200);
});

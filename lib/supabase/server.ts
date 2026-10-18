import 'server-only';
import {createServerClient} from '@supabase/ssr';
import {createClient as createPlainClient} from '@supabase/supabase-js';
import {cookies} from 'next/headers';
import {supabaseConfig,secretKey} from '@/lib/env';
import {HttpError} from '@/lib/server/http';
// Request-scoped client acting as the signed-in user: every query is subject to row-level security.
export async function userClient(){
 const config=supabaseConfig();if(!config)throw new HttpError(503,'Accounts and saving are not configured on this server yet.','backend-unconfigured');
 const store=await cookies();
 return createServerClient(config.url,config.publishableKey,{cookies:{getAll:()=>store.getAll(),setAll:list=>{for(const {name,value,options} of list)store.set(name,value,options);}}});
}
// Privileged client for server-only operations. Callers must verify the actor's authority first.
export function adminClient(){
 const config=supabaseConfig(),key=secretKey();if(!config||!key)throw new HttpError(503,'Accounts and saving are not configured on this server yet.','backend-unconfigured');
 return createPlainClient(config.url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}

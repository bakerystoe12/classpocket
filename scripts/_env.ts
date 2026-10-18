import {existsSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
// Scripts read .env.local when present; real values never live in the repository.
for(const f of ['.env.local','.env'])if(existsSync(f))process.loadEnvFile(f);
export function admin(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY;if(!url||!key){console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (for example in .env.local).');process.exit(1);}return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});}

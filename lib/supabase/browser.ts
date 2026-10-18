'use client';
import {createBrowserClient} from '@supabase/ssr';
// Used only for direct-to-storage uploads with a server-issued signed token.
export function browserClient(){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;if(!url||!key)throw new Error('File uploads are not configured on this server.');return createBrowserClient(url,key);}

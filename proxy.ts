import {NextResponse,type NextRequest} from 'next/server';
import {createServerClient} from '@supabase/ssr';
// Refreshes the Supabase auth cookies before route handlers run (cookie-based Next.js integration).
// Authorization is never decided here; each route verifies the caller itself.
export async function proxy(request:NextRequest){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 let response=NextResponse.next({request});if(!url||!key)return response;
 const supabase=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll:list=>{for(const {name,value} of list)request.cookies.set(name,value);response=NextResponse.next({request});for(const {name,value,options} of list)response.cookies.set(name,value,options);}}});
 try{await supabase.auth.getClaims();}catch{}
 return response;
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|studio/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|wav|webm)$).*)']};

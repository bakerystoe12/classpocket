import {NextResponse,type NextRequest} from 'next/server';
import {userClient} from '@/lib/supabase/server';
import {appUrl} from '@/lib/env';
export const runtime='nodejs';export const dynamic='force-dynamic';
// Email confirmation / magic-link landing. Redirects only to same-site paths.
export async function GET(req:NextRequest){
 const code=req.nextUrl.searchParams.get('code'),next=req.nextUrl.searchParams.get('next')||'/',safe=next.startsWith('/')&&!next.startsWith('//')?next:'/';
 const base=appUrl(req.nextUrl.origin);
 if(code){try{const supabase=await userClient();const {error}=await supabase.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(safe,base));}catch{}}
 return NextResponse.redirect(new URL('/?auth=failed',base));
}

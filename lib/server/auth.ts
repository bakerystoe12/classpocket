import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {userClient} from '@/lib/supabase/server';
import {HttpError} from './http';
export type Actor={supabase:SupabaseClient;id:string;isAnonymous:boolean;isTeacher:boolean;email?:string};
// Verifies the session JWT (signature checked by getClaims) before trusting any identity.
export async function currentActor():Promise<Actor|null>{
 const supabase=await userClient();const {data,error}=await supabase.auth.getClaims();
 if(error||!data?.claims?.sub)return null;const claims=data.claims as {sub:string;is_anonymous?:boolean;email?:string};
 let isTeacher=false;if(!claims.is_anonymous){const {data:roles}=await supabase.from('user_roles').select('role').eq('user_id',claims.sub);isTeacher=!!roles?.some(r=>r.role==='teacher');}
 return {supabase,id:claims.sub,isAnonymous:!!claims.is_anonymous,isTeacher,email:claims.email};
}
export async function requireActor(){const a=await currentActor();if(!a)throw new HttpError(401,'Open the app to start a guest profile, or sign in.','unauthenticated');return a;}
export async function requireTeacher(){const a=await requireActor();if(!a.isTeacher)throw new HttpError(403,'Teacher access required. Sign in with a teacher account provisioned by your administrator.','forbidden');return a;}

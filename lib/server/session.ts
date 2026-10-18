import 'server-only';
import {z} from 'zod';
import {userClient} from '@/lib/supabase/server';
import {aiConfig,backendReady,demoMode} from '@/lib/env';
import {currentActor} from './auth';
import {HttpError} from './http';
export async function sessionStatus(){
 const configured={backend:backendReady(),ai:!!aiConfig(),demo:demoMode()};if(!configured.backend)return {configured,user:null};
 const a=await currentActor();return {configured,user:a?{id:a.id,isAnonymous:a.isAnonymous,isTeacher:a.isTeacher,email:a.email||null}:null};
}
export async function startGuest(){
 const existing=await currentActor();if(existing)return sessionStatus();
 const supabase=await userClient();const {error}=await supabase.auth.signInAnonymously();
 if(error)throw new HttpError(error.status===429?429:503,error.status===429?'Too many new guest profiles from this network. Try again later.':'Guest profiles are unavailable. Ask the administrator to enable anonymous sign-ins in Supabase Auth.','guest-unavailable',{retryAfter:60});
 return sessionStatus();
}
export async function signIn(input:unknown){
 const b=z.object({email:z.string().trim().email().max(200),password:z.string().min(6).max(200)}).parse(input);
 const supabase=await userClient();const {error}=await supabase.auth.signInWithPassword(b);
 if(error)throw new HttpError(error.status===429?429:401,error.status===429?'Too many sign-in attempts. Wait a minute and try again.':'That email or password is not correct.','sign-in-failed',{retryAfter:60});
 return sessionStatus();
}
export async function signOut(){const supabase=await userClient();await supabase.auth.signOut();return {ok:true};}

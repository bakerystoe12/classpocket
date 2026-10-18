import type {NextRequest} from 'next/server';
import {route,json,readJson} from '@/lib/server/http';
import {currentActor} from '@/lib/server/auth';
import {sessionStatus,signIn,signOut,startGuest} from '@/lib/server/session';
import {handle} from '@/lib/server/classroom';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
// Classroom (/classroom, /join, /play) API. Teacher access now comes from a verified Supabase account with a granted role.
const handler=route(async(req:NextRequest,{params}:{params:Promise<{path:string[]}>})=>{
 const parts=(await params).path,routeName=parts.join('/');
 if(routeName==='status'){const s=await sessionStatus();return json({teacher:!!s.user?.isTeacher,ai:s.configured.ai,backend:s.configured.backend,signedIn:!!s.user&&!s.user.isAnonymous,email:s.user?.email||null});}
 if(routeName==='login'&&req.method==='POST')return json(await signIn(await readJson(req)));
 if(routeName==='logout'&&req.method==='POST'){await signOut();await startGuest().catch(()=>null);return json({ok:true});}
 const body=req.method==='GET'?{}:await readJson(req);
 let actor=await currentActor();if(!actor&&routeName==='join'){await startGuest();actor=await currentActor();}
 return json(await handle(actor,req.method,parts,body));
});
export {handler as GET,handler as POST,handler as PUT};

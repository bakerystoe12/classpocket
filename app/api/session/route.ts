import {route,json,readJson,HttpError} from '@/lib/server/http';
import {sessionStatus,startGuest,signIn,signOut} from '@/lib/server/session';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const GET=route(async()=>json(await sessionStatus()));
export const POST=route(async req=>{const b=await readJson(req);
 if(b.action==='guest')return json(await startGuest());
 if(b.action==='sign-in')return json(await signIn(b));
 if(b.action==='sign-out')return json(await signOut());
 throw new HttpError(400,'Unknown session action.');});

import {z} from 'zod';
import {route,json,HttpError} from '@/lib/server/http';
import {backendReady} from '@/lib/env';
import {currentActor} from '@/lib/server/auth';
import {feed,post} from '@/lib/server/social';
import {parsePreview} from '@/lib/rhythm';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const GET=route(async req=>{
 const q=req.nextUrl.searchParams,actor=backendReady()?await currentActor():null;
 if(backendReady()&&!actor)throw new HttpError(401,'Start a guest profile first.','unauthenticated');
 const id=q.get('id');if(id)return json({post:await post(actor,id)});
 const mode=z.enum(['for-you','following','learn']).catch('for-you').parse(q.get('mode'));
 return json(await feed(actor,{mode,q:q.get('q')||'',cursor:q.get('cursor'),preview:parsePreview(q.get('preview'))}));
});

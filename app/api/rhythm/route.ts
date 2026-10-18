import {route,json,readJson} from '@/lib/server/http';
import {requireActor} from '@/lib/server/auth';
import * as rhythm from '@/lib/server/rhythm';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const GET=route(async req=>{const actor=await requireActor(),q=req.nextUrl.searchParams;
 if(q.get('schedule'))return json(await rhythm.sharedSchedule(actor,q.get('schedule')!));
 if(q.get('room'))return json(await rhythm.room(actor,q.get('room')!));
 return json(await rhythm.state(actor));});
export const POST=route(async req=>{const actor=await requireActor(),b=await readJson(req);const extra=await rhythm.act(actor,b);return json({...(await rhythm.state(actor)),...extra});});

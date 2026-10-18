import {route,json,readJson} from '@/lib/server/http';
import {requireActor} from '@/lib/server/auth';
import * as creator from '@/lib/server/creator';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export const GET=route(async req=>{const actor=await requireActor(),token=req.nextUrl.searchParams.get('token');return json(token?await creator.shared(actor,token):await creator.state(actor));});
export const POST=route(async req=>json(await creator.act(await requireActor(),await readJson(req))));

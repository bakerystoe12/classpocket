import {route,json,readJson} from '@/lib/server/http';
import {requireActor} from '@/lib/server/auth';
import * as study from '@/lib/server/study';
export const runtime='nodejs';export const dynamic='force-dynamic';export const maxDuration=60;
export const GET=route(async req=>json(await study.get(await requireActor(),req.nextUrl.searchParams)));
export const POST=route(async req=>{const actor=await requireActor();return json(await study.post(actor,await readJson(req)));});

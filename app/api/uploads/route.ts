import {route,json,readJson} from '@/lib/server/http';
import {requireTeacher} from '@/lib/server/auth';
import {signUpload} from '@/lib/server/pdf';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const POST=route(async req=>json(await signUpload(await requireTeacher(),await readJson(req))));

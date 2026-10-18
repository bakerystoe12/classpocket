import 'server-only';
import {z} from 'zod';
import {validateSchedule,type RhythmState,type Room,type Enrolment} from '@/lib/rhythm';
import type {Gizmo,GizmoDefinition} from '@/lib/gizmo-spec';
import {adminClient} from '@/lib/supabase/server';
import type {Actor} from './auth';
import {HttpError,fromPg,invalid} from './http';
import {effectiveSchedule} from './social';
const code12=z.string().trim().transform(s=>s.toUpperCase()).pipe(z.string().regex(/^[A-F0-9]{12}$/,'Codes are 12 characters (0–9, A–F).'));
export async function state(actor:Actor):Promise<RhythmState>{
 const [sched,{data:rooms,error}]=await Promise.all([effectiveSchedule(actor),actor.supabase.from('rooms').select('code,owner_id,created_at,snapshot->>title,room_members(joined_at,profiles(name,handle))').order('created_at',{ascending:false}).limit(20)]);
 if(error)fromPg(error);
 let enrolments:Enrolment[]=[];if(sched.isTeacher){const {data,error:e}=await actor.supabase.rpc('teacher_enrolments');if(e)fromPg(e);enrolments=(data||[]) as Enrolment[];}
 const list:Room[]=(rooms||[]).map(r=>({code:r.code,title:r.title as string,owner:r.owner_id===actor.id,createdAt:r.created_at,members:((r.room_members||[]) as unknown as {joined_at:string;profiles:{name:string;handle:string}|null}[]).sort((a,b)=>a.joined_at.localeCompare(b.joined_at)).slice(0,30).map(m=>({name:m.profiles?.name||'Someone',handle:m.profiles?.handle||''}))}));
 return {...sched,rooms:list,enrolments,serverNow:new Date().toISOString()};
}
// A room snapshot is visible only to members (RLS); later source edits never change it.
export async function room(actor:Actor,code:string){const c=code12.parse(code);const {data,error}=await actor.supabase.from('rooms').select('code,owner_id,snapshot,gizmo_id,source_version').eq('code',c).maybeSingle();if(error)fromPg(error);if(!data)throw new HttpError(404,'Join this room with its invite code first.','not-member');
 const post:Gizmo={...(data.snapshot as GizmoDefinition),id:`room-${data.code.toLowerCase()}`,creator:'',published:false,owned:data.owner_id===actor.id,version:data.source_version};return {code:data.code,post};}
export async function act(actor:Actor,b:Record<string,unknown>){
 const rpc=async(fn:string,args:Record<string,unknown>={})=>{const {data,error}=await actor.supabase.rpc(fn,args);if(error)fromPg(error);return data;};
 switch(b.action){
  case 'schedule-save':{const content=invalid(()=>validateSchedule(b.schedule));const {error}=await adminClient().rpc('save_schedule',{p_actor:actor.id,p_content:content});if(error)fromPg(error);return {};}
  case 'schedule-share':{const kind=z.enum(['personal','teacher']).parse(b.kind);if(kind==='teacher'&&!actor.isTeacher)throw new HttpError(403,'Teacher sign-in required to publish a managed timetable.','forbidden');return {shared:{code:await rpc('share_schedule',{p_kind:kind}) as string,kind}};}
  case 'schedule-join':await rpc('join_schedule',{p_code:code12.parse(b.code)});return {};
  case 'schedule-release':await rpc('release_enrolment',{p_code:code12.parse(b.code),p_student:z.string().uuid().parse(b.student)});return {};
  case 'room-create':return {invite:{code:await rpc('create_room',{p_gizmo:z.string().regex(/^g-[a-f0-9]{18}$/,'Save your own custom gizmo before inviting friends.').parse(b.post)}) as string}};
  case 'room-join':{const c=code12.parse(b.code);await rpc('join_room',{p_code:c});return {joined:c};}
  default:throw new HttpError(400,'Unknown schedule or invite action.');
 }
}
export async function sharedSchedule(actor:Actor,code:string){const {data,error}=await actor.supabase.rpc('schedule_by_code',{p_code:code12.parse(code)});if(error)fromPg(error);if(!data)throw new HttpError(404,'Schedule code not found.','not-found');return data;}

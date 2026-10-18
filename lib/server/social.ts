import 'server-only';
import {randomBytes} from 'node:crypto';
import {z} from 'zod';
import {gizmos as authored,demoCreators,templateById} from '@/lib/gizmos';
import {learningGizmos} from '@/lib/learning-feed';
import {GIZMO_SCHEMA_VERSION,gizmoDefinitionSchema,parseDefinition,type Gizmo,type GizmoDefinition} from '@/lib/gizmo-spec';
import {blankSchedule,feedPolicy,validateSchedule,type PreviewClock,type Schedule} from '@/lib/rhythm';
import {adminClient} from '@/lib/supabase/server';
import type {Actor} from './auth';
import {HttpError,fromPg} from './http';
export const PAGE=8;
export type FeedMode='for-you'|'following'|'learn';
export type Post=Gizmo&{kind:'gizmo'|'lesson';mine:{like:boolean;save:boolean;repost:boolean};aiGenerated:boolean;reviewed:boolean};
const columns='id,kind,owner_id,authored,creator_persona,creator_handle,is_public,definition,published_version,feed_sort,subject,like_count,save_count,repost_count,comment_count,ai_generated,reviewed_by';
type Row={id:string;kind:'gizmo'|'lesson';owner_id:string|null;authored:boolean;creator_persona:string|null;creator_handle:string;is_public:boolean;definition:GizmoDefinition;published_version:number;feed_sort:string;subject:string;like_count:number;save_count:number;repost_count:number;comment_count:number;ai_generated:boolean;reviewed_by:string|null};
const personas=new Set(demoCreators.map(c=>c.handle));
function toPost(r:Row,mine:{gizmo_id:string;kind:string}[],me?:string):Post{
 const has=(kind:string)=>mine.some(m=>m.gizmo_id===r.id&&m.kind===kind);
 return {...r.definition,id:r.id,kind:r.kind,creator:r.creator_persona||r.creator_handle,published:r.is_public,authored:r.authored,owned:!!me&&r.owner_id===me,version:r.published_version,
  counts:{like:r.like_count,save:r.save_count,repost:r.repost_count,comment:r.comment_count},mine:{like:has('like'),save:has('save'),repost:has('repost')},aiGenerated:r.ai_generated,reviewed:r.authored||!!r.reviewed_by};
}
// Offline catalogue used when the backend is not configured: authored posts only, no engagement.
const catalogue:Post[]=[...authored,...learningGizmos].map(g=>({...g,kind:learningGizmos.includes(g)?'lesson' as const:'gizmo' as const,counts:{like:0,save:0,repost:0,comment:0},mine:{like:false,save:false,repost:false},aiGenerated:false,reviewed:true}));
export const safeQuery=(q:string)=>q.normalize('NFKC').replace(/[^\p{L}\p{N} .\-_]/gu,' ').replace(/\s+/g,' ').trim().slice(0,60);
const cursorSchema=z.string().regex(/^[0-9TZ:.+\- ]{10,40}\|[a-z0-9-]{3,100}$/);
export async function effectiveSchedule(actor:Actor|null):Promise<{own:Schedule;effective:Schedule;link:{code:string;title:string}|null;isTeacher:boolean}>{
 if(!actor)return {own:blankSchedule(),effective:blankSchedule(),link:null,isTeacher:false};
 const {data,error}=await actor.supabase.rpc('schedule_state');if(error)fromPg(error);
 const d=data as {own:Schedule|null;effective:Schedule|null;link:{code:string;title:string}|null;isTeacher:boolean};
 const safe=(s:Schedule|null)=>{try{return s?validateSchedule(s):blankSchedule();}catch{return blankSchedule();}};
 return {own:safe(d.own),effective:safe(d.effective),link:d.link,isTeacher:d.isTeacher};
}
export async function feed(actor:Actor|null,{mode,q,cursor,preview,now=new Date()}:{mode:FeedMode;q:string;cursor?:string|null;preview?:PreviewClock|null;now?:Date}){
 const sched=await effectiveSchedule(actor);
 // Students on a teacher-managed timetable cannot use the judge preview at all.
 const policy=feedPolicy(sched.effective,now,sched.link&&!sched.isTeacher?null:preview);
 const query=safeQuery(q),kind=mode==='learn'?'lesson':'gizmo';
 const base={policy:{subject:policy.subject,source:policy.source,slot:policy.slot,preview:policy.preview,timezone:policy.schedule.timezone},serverNow:now.toISOString()};
 if(!actor){
  const rows=catalogue.filter(p=>p.kind===kind&&(!policy.subject||p.subject===policy.subject)&&mode!=='following'&&(!query||`${p.title} ${p.caption} ${p.creator}`.toLowerCase().includes(query.toLowerCase())));
  const start=cursor?Number(cursor.split('|')[1]?.replace('c-',''))||0:0;
  return {...base,posts:rows.slice(start,start+PAGE),nextCursor:start+PAGE<rows.length?`offline|c-${start+PAGE}`:null,configured:false};
 }
 let sql=actor.supabase.from('gizmos').select(columns).eq('is_public',true).eq('kind',kind).order('feed_sort',{ascending:false}).order('id',{ascending:false}).limit(PAGE+1);
 if(policy.subject)sql=sql.eq('subject',policy.subject);
 if(query)sql=sql.or(`title.ilike."%${query}%",caption.ilike."%${query}%",creator_handle.ilike."%${query}%"`);
 if(mode==='following'){
  const {data:follows,error}=await actor.supabase.from('follows').select('target_id,target_persona').eq('follower_id',actor.id).limit(500);if(error)fromPg(error);
  const ids=(follows||[]).flatMap(f=>f.target_id?[f.target_id]:[]),ps=(follows||[]).flatMap(f=>f.target_persona?[f.target_persona]:[]);
  if(!ids.length&&!ps.length)return {...base,posts:[],nextCursor:null,configured:true};
  sql=sql.or([ids.length?`owner_id.in.(${ids.join(',')})`:'',ps.length?`creator_persona.in.(${ps.map(p=>`"${p}"`).join(',')})`:''].filter(Boolean).join(','));
 }
 if(cursor){const c=cursorSchema.parse(cursor),[at,id]=c.split('|');sql=sql.or(`feed_sort.lt."${at}",and(feed_sort.eq."${at}",id.lt.${id})`);}
 const {data,error}=await sql;if(error)fromPg(error);
 const rows=(data||[]) as Row[],page=rows.slice(0,PAGE),mine=await myReactions(actor,page.map(r=>r.id));
 const last=page.at(-1);
 return {...base,posts:page.map(r=>toPost(r,mine,actor.id)),nextCursor:rows.length>PAGE&&last?`${new Date(last.feed_sort).toISOString()}|${last.id}`:null,configured:true};
}
async function myReactions(actor:Actor,ids:string[]){if(!ids.length)return [];const {data,error}=await actor.supabase.from('reactions').select('gizmo_id,kind').eq('user_id',actor.id).in('gizmo_id',ids);if(error)fromPg(error);return data||[];}
// Direct links stay openable regardless of timetable recommendations (they are not an access firewall).
export async function post(actor:Actor|null,id:string){
 if(!/^[a-z0-9][a-z0-9-]{2,99}$/.test(id))throw new HttpError(404,'Gizmo not found.','not-found');
 if(!actor){const p=catalogue.find(p=>p.id===id);if(!p)throw new HttpError(404,'Gizmo not found.','not-found');return p;}
 const {data,error}=await actor.supabase.from('gizmos').select(columns).eq('id',id).maybeSingle();if(error)fromPg(error);
 if(!data)throw new HttpError(404,'This gizmo is private or no longer exists.','not-found');
 return toPost(data as Row,await myReactions(actor,[id]),actor.id);
}
export async function me(actor:Actor){
 const [{data:profile,error},{data:follows},{data:drafts}]=await Promise.all([
  actor.supabase.from('profiles').select('handle,name,bio,follower_count,is_guest').eq('id',actor.id).single(),
  actor.supabase.from('follows').select('target_persona,target:profiles!follows_target_id_fkey(handle)').eq('follower_id',actor.id).limit(500),
  actor.supabase.from('gizmo_drafts').select('id,version,updated_at,definition->>title,definition->>engine').eq('owner_id',actor.id).order('updated_at',{ascending:false}).limit(50)]);
 if(error)fromPg(error);
 const {data:published}=await actor.supabase.from('gizmos').select('id,published_version,is_public').eq('owner_id',actor.id).limit(50);
 const following=(follows||[]).map(f=>f.target_persona||(f.target as unknown as {handle:string}|null)?.handle).filter(Boolean) as string[];
 const projects=(drafts||[]).map(d=>{const pub=published?.find(p=>p.id===d.id);return {id:d.id,title:d.title as string,engine:d.engine as string,version:d.version,updatedAt:d.updated_at,publishedVersion:pub?.is_public?pub.published_version:null};});
 return {profile:{handle:profile!.handle,name:profile!.name,bio:profile!.bio,isGuest:profile!.is_guest},followers:profile!.follower_count,following,projects,isTeacher:actor.isTeacher,isAnonymous:actor.isAnonymous};
}
export async function draft(actor:Actor,id:string){
 const [{data,error},{data:versions}]=await Promise.all([actor.supabase.from('gizmo_drafts').select('id,definition,version').eq('id',id).maybeSingle(),
  actor.supabase.from('gizmo_versions').select('version,created_at,note,provenance->>kind').eq('gizmo_id',id).order('version',{ascending:false}).limit(30)]);
 if(error)fromPg(error);if(!data)throw new HttpError(404,'Draft not found. Only its owner can open it.','not-found');
 const {data:pub}=await actor.supabase.from('gizmos').select('published_version,is_public').eq('id',id).maybeSingle();
 return {draft:{...(data.definition as GizmoDefinition),id:data.id,version:data.version,creator:'',published:!!pub?.is_public,owned:true} as Gizmo,publishedVersion:pub?.is_public?pub.published_version:null,versions:(versions||[]).map(v=>({version:v.version,created:v.created_at,note:v.note,kind:v.kind}))};
}
export async function comments(actor:Actor,id:string){
 const {data,error}=await actor.supabase.from('comments').select('id,body,created_at,author:profiles!comments_user_id_fkey(handle)').eq('gizmo_id',id).order('created_at',{ascending:false}).limit(50);if(error)fromPg(error);
 return (data||[]).reverse().map(c=>({id:c.id,post:id,text:c.body,created:c.created_at,handle:(c.author as unknown as {handle:string}|null)?.handle||'someone'}));
}
export async function profileView(actor:Actor,handle:string,cursor?:string|null){
 const h=z.string().regex(/^[a-zA-Z0-9_.]{2,25}$/).parse(handle);const persona=demoCreators.find(c=>c.handle===h.toLowerCase());
 let profile:{handle:string;name:string;bio:string;followers:number|null;persona:boolean};
 let sql=actor.supabase.from('gizmos').select(columns).eq('is_public',true).order('feed_sort',{ascending:false}).order('id',{ascending:false}).limit(24);
 if(persona){profile={handle:persona.handle,name:persona.name,bio:persona.bio,followers:null,persona:true};sql=sql.eq('creator_persona',persona.handle);}
 else{const {data,error}=await actor.supabase.from('profiles').select('id,handle,name,bio,follower_count').ilike('handle',h).maybeSingle();if(error)fromPg(error);if(!data)throw new HttpError(404,'Creator not found.','not-found');profile={handle:data.handle,name:data.name,bio:data.bio,followers:data.follower_count,persona:false};sql=sql.eq('owner_id',data.id);}
 if(cursor){const [at,id]=cursorSchema.parse(cursor).split('|');sql=sql.or(`feed_sort.lt."${at}",and(feed_sort.eq."${at}",id.lt.${id})`);}
 const {data,error}=await sql;if(error)fromPg(error);const rows=(data||[]) as Row[];
 return {profile,posts:rows.map(r=>toPost(r,[],actor.id))};
}
export async function reactionList(actor:Actor,kind:'like'|'save'|'repost'){
 const {data,error}=await actor.supabase.from('reactions').select(`gizmo:gizmos(${columns})`).eq('user_id',actor.id).eq('kind',kind).order('created_at',{ascending:false}).limit(30);if(error)fromPg(error);
 const rows=(data||[]).map(d=>d.gizmo as unknown as Row).filter(Boolean);return rows.map(r=>toPost(r,[{gizmo_id:r.id,kind}],actor.id));
}
export async function myPublished(actor:Actor){const {data,error}=await actor.supabase.from('gizmos').select(columns).eq('owner_id',actor.id).eq('is_public',true).order('feed_sort',{ascending:false}).limit(30);if(error)fromPg(error);return ((data||[]) as Row[]).map(r=>toPost(r,[],actor.id));}
// --- Mutations ---------------------------------------------------------------------------------
export async function setReaction(actor:Actor,input:unknown){const b=z.object({post:z.string().max(100),kind:z.enum(['like','save','repost']),on:z.boolean()}).parse(input);const {data,error}=await actor.supabase.rpc('set_reaction',{p_gizmo:b.post,p_kind:b.kind,p_on:b.on});if(error)fromPg(error);return data as {on:boolean;count:number};}
export async function setFollow(actor:Actor,input:unknown){const b=z.object({creator:z.string().min(2).max(40),on:z.boolean()}).parse(input);const {error}=await actor.supabase.rpc('set_follow',{p_handle:b.creator,p_on:b.on});if(error)fromPg(error);}
export async function addComment(actor:Actor,input:unknown){const b=z.object({post:z.string().max(100),text:z.string().trim().min(1).max(500),clientId:z.string().uuid()}).parse(input);const {error}=await actor.supabase.rpc('add_comment',{p_gizmo:b.post,p_body:b.text,p_client_id:b.clientId});if(error)fromPg(error);return comments(actor,b.post);}
export async function report(actor:Actor,input:unknown){const b=z.object({post:z.string().max(100),reason:z.string().trim().min(1).max(300)}).parse(input);const {error}=await actor.supabase.from('reports').upsert({reporter_id:actor.id,gizmo_id:b.post,reason:b.reason},{onConflict:'reporter_id,gizmo_id',ignoreDuplicates:true});if(error)fromPg(error);}
export async function updateProfile(actor:Actor,input:unknown){
 const p=z.object({handle:z.string().regex(/^[a-zA-Z0-9_.]{2,25}$/,'Usernames use 2–25 letters, numbers, dots or underscores.'),name:z.string().trim().min(1).max(40),bio:z.string().max(160)}).parse(input);
 if(personas.has(p.handle.toLowerCase()))throw new HttpError(409,'That username is already taken.','conflict');
 const {error}=await actor.supabase.from('profiles').update({handle:p.handle,name:p.name,bio:p.bio}).eq('id',actor.id);if(error)fromPg(error);
}
const newId=()=>`g-${randomBytes(9).toString('hex')}`;
type Provenance=GizmoDefinition['provenance'];
// Clients never choose provenance: an AI draft stays labelled AI after manual tweaks, and nothing is "reviewed" by self-assertion.
async function priorProvenance(actor:Actor,id:string):Promise<Provenance|null>{const {data}=await adminClient().from('gizmo_drafts').select('owner_id,definition->provenance').eq('id',id).maybeSingle();if(data&&data.owner_id!==actor.id)throw new HttpError(403,'Only the owner can edit this gizmo.','forbidden');return (data?.provenance as Provenance)||null;}
export async function saveDefinition(actor:Actor,{id,definition,expectedVersion,provenance,note}:{id:string|null;definition:GizmoDefinition;expectedVersion:number;provenance:Provenance;note:string}){
 const key=id||newId();const def=parseDefinition({...definition,provenance:{...provenance,reviewed:false}});
 const {data,error}=await adminClient().rpc('save_gizmo_draft',{p_actor:actor.id,p_id:key,p_definition:def,p_schema_version:GIZMO_SCHEMA_VERSION,p_expected_version:id?expectedVersion:0,p_provenance:def.provenance,p_note:note});
 if(error)fromPg(error);return {id:key,version:data as number,definition:def};
}
export async function saveManual(actor:Actor,input:unknown){
 const b=z.object({id:z.string().regex(/^g-[a-f0-9]{18}$/).nullable(),version:z.number().int().min(0),gizmo:z.unknown(),template:z.string().max(40).optional()}).parse(input);
 const raw=gizmoDefinitionSchema.parse({...(b.gizmo as object),schemaVersion:GIZMO_SCHEMA_VERSION,provenance:{kind:'manual'}}) as unknown as GizmoDefinition;
 const prior=b.id?await priorProvenance(actor,b.id):null;
 const kind:Provenance['kind']=prior?(prior.kind==='authored'?'template':prior.kind):b.template?'template':'manual';
 return saveDefinition(actor,{id:b.id,definition:raw,expectedVersion:b.version,provenance:{...(prior||{}),kind,reviewed:false},note:prior?'Manual edit':b.template?`Started from the ${b.template} template`:'Manual draft'});
}
export async function publish(actor:Actor,input:unknown){const b=z.object({id:z.string().regex(/^g-[a-f0-9]{18}$/),version:z.number().int().min(1)}).parse(input);const {data,error}=await adminClient().rpc('publish_gizmo',{p_actor:actor.id,p_id:b.id,p_expected_version:b.version});if(error)fromPg(error);return {id:b.id,publishedVersion:data as number};}
export async function unpublish(actor:Actor,input:unknown){const b=z.object({id:z.string().regex(/^g-[a-f0-9]{18}$/)}).parse(input);const {error}=await adminClient().rpc('unpublish_gizmo',{p_actor:actor.id,p_id:b.id});if(error)fromPg(error);}
export async function restore(actor:Actor,input:unknown){const b=z.object({id:z.string().regex(/^g-[a-f0-9]{18}$/),restore:z.number().int().min(1),version:z.number().int().min(1)}).parse(input);const {data,error}=await adminClient().rpc('restore_gizmo_version',{p_actor:actor.id,p_id:b.id,p_version:b.restore,p_expected_version:b.version});if(error)fromPg(error);return {id:b.id,version:data as number};}
export async function remix(actor:Actor,input:unknown){
 const b=z.object({post:z.string().max(100)}).parse(input);const source=b.post==='planet-hop'?{...templateById('jumper')}:await post(actor,b.post);
 const def={...source,title:`${source.title} remix`.slice(0,70),attribution:`Remixed from ${source.title} by @${source.creator}`.slice(0,200)} as GizmoDefinition;
 return saveDefinition(actor,{id:null,definition:def,expectedVersion:0,provenance:{kind:'remix',remixOf:source.id,reviewed:false},note:`Remix of ${source.id}`});
}
export async function deleteAccount(actor:Actor){const {error}=await adminClient().auth.admin.deleteUser(actor.id);if(error)throw new HttpError(500,'Could not delete this account. Nothing was removed.','delete-failed');}

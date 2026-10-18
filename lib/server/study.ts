import 'server-only';
import {randomBytes} from 'node:crypto';
import {z} from 'zod';
import {studySamples,draftFromPages,validateStudy,practiceBatch,gradeCargo,type Study,type Challenge} from '@/lib/study';
import {adminClient} from '@/lib/supabase/server';
import type {Actor} from './auth';
import {HttpError,fromPg,invalid} from './http';
import {extractUploaded} from './pdf';
const category=z.enum(['Physics','Chemistry','Biology','Mathematics','Other']);
const code6=z.string().trim().transform(s=>s.toUpperCase()).pipe(z.string().regex(/^[A-Z0-9]{6}$/,'Class codes are six letters or numbers.'));
// Students receive the missions with their quoted source lines, never the full extracted lesson pages.
const forStudents=(c:Study)=>({...c,pages:[]});
async function assignment(code:string){const {data,error}=await adminClient().from('study_assignments').select('code,content,version,owner_id').eq('code',code6.parse(code)).maybeSingle();if(error)fromPg(error);if(!data)throw new HttpError(404,'Topic session not found. Check your class code.','not-found');return data as {code:string;content:Study;version:number;owner_id:string|null};}
async function runState(actor:Actor,runId:string){
 const {data:run,error}=await actor.supabase.from('study_runs').select('id,code,nickname,missions,created_at,finished_at,user_id').eq('id',runId).maybeSingle();if(error)fromPg(error);
 if(!run||run.user_id!==actor.id)throw new HttpError(404,'Join a topic session first.','not-joined');
 const [a,{data:attempts,error:e2}]=await Promise.all([assignment(run.code),actor.supabase.from('study_attempts').select('mission_id,answer,correct,created_at').eq('run_id',run.id).order('created_at').limit(1000)]);if(e2)fromPg(e2);
 const list=(attempts||[]).map(t=>({mission:t.mission_id,cargo:t.answer,correct:t.correct?1:0,created:t.created_at}));
 return {id:run.id,code:run.code,nickname:run.nickname,missions:run.missions as Challenge[],finished:run.finished_at,assignment:{code:a.code,version:a.version,content:forStudents(a.content)},attempts:list,completed:[...new Set(list.filter(t=>t.correct).map(t=>t.mission))]};
}
async function latestRun(actor:Actor,code?:string){let q=actor.supabase.from('study_runs').select('id').eq('user_id',actor.id).order('created_at',{ascending:false}).limit(1);if(code)q=q.eq('code',code);const {data,error}=await q;if(error)fromPg(error);return data?.[0]?.id as string|undefined;}
export async function get(actor:Actor,q:URLSearchParams){
 if(q.get('teacher')){
  if(!actor.isTeacher)throw new HttpError(403,'Teacher access required.','forbidden');const id=q.get('id');
  if(id&&q.get('results'))return results(actor,z.string().uuid().parse(id));
  if(id)return teacherDraft(actor,z.string().uuid().parse(id));
  const {data,error}=await actor.supabase.from('study_drafts').select('id,content,version,created_at').eq('owner_id',actor.id).order('created_at',{ascending:false}).limit(30);if(error)fromPg(error);
  return (data||[]).map(r=>({id:r.id,content:r.content,version:r.version,created:r.created_at}));
 }
 const code=q.get('code');
 if(code){const a=await assignment(code),run=await latestRun(actor,a.code);return run?runState(actor,run):{assignment:{code:a.code,version:a.version,content:forStudents(a.content)},needsJoin:true};}
 const run=await latestRun(actor);
 return {run:run?await runState(actor,run):null,samples:[{key:'physics',title:'Moments & turning forces',category:'Physics'},{key:'chemistry',title:'Atoms & charge',category:'Chemistry'}]};
}
async function teacherDraft(actor:Actor,id:string){const {data,error}=await actor.supabase.from('study_drafts').select('id,content,version,created_at').eq('id',id).maybeSingle();if(error)fromPg(error);if(!data)throw new HttpError(404,'Session draft not found.','not-found');return {id:data.id,content:data.content as Study,version:data.version,created:data.created_at};}
async function results(actor:Actor,id:string){
 const {data:pubs,error}=await actor.supabase.from('study_assignments').select('code,version,created_at').eq('draft_id',id).eq('owner_id',actor.id).order('created_at',{ascending:false}).limit(20);if(error)fromPg(error);
 return Promise.all((pubs||[]).map(async p=>{const {data:runs,error:e}=await actor.supabase.from('study_runs').select('id,nickname,created_at,finished_at,missions,study_attempts(mission_id,answer,correct,created_at)').eq('code',p.code).order('created_at').limit(200);if(e)fromPg(e);
  return {code:p.code,version:p.version,created:p.created_at,runs:(runs||[]).map(r=>({id:r.id,nickname:r.nickname,created:r.created_at,finished:r.finished_at,missionCount:(r.missions as unknown[]).length,attempts:((r.study_attempts||[]) as {mission_id:string;answer:string;correct:boolean;created_at:string}[]).sort((a,b)=>a.created_at.localeCompare(b.created_at)).map(t=>({mission:t.mission_id,cargo:t.answer,correct:t.correct?1:0,created:t.created_at}))}))};}));
}
async function insertDraft(actor:Actor,content:Study){const {data,error}=await adminClient().from('study_drafts').insert({owner_id:actor.id,content,version:1}).select('id').single();if(error)fromPg(error);return teacherDraft(actor,data.id);}
export async function post(actor:Actor,b:Record<string,unknown>){
 const teacherOnly=()=>{if(!actor.isTeacher)throw new HttpError(403,'Teacher access required.','forbidden');};
 switch(b.action){
  case 'create':{teacherOnly();
   if(typeof b.sample==='string'&&b.sample in studySamples)return insertDraft(actor,studySamples[b.sample as keyof typeof studySamples]);
   const text=z.string().min(40,'Paste at least 40 characters of notes.').max(150000).parse(b.text);
   return insertDraft(actor,invalid(()=>draftFromPages(text.split(/\n\s*---\s*\n|\f/).map((text,i)=>({page:i+1,text})).filter(p=>p.text.trim()),z.string().trim().min(1).max(200).catch('My topic session').parse(b.title),category.parse(b.category))));}
  case 'extract':{teacherOnly();const path=z.string().max(200).parse(b.path),pages=await extractUploaded(actor,path);
   const content=invalid(()=>draftFromPages(pages,z.string().trim().min(1).max(200).catch('Uploaded lesson').parse(b.title),category.catch('Other').parse(b.category)));content.sourceName=z.string().max(200).catch('Uploaded PDF').parse(b.filename);return insertDraft(actor,invalid(()=>validateStudy(content)));}
  case 'save':{teacherOnly();const id=z.string().uuid().parse(b.id),version=z.number().int().parse(b.version),content=invalid(()=>validateStudy(b.content));
   const {data,error}=await adminClient().from('study_drafts').update({content,version:version+1,updated_at:new Date().toISOString()}).eq('id',id).eq('owner_id',actor.id).eq('version',version).select('id');if(error)fromPg(error);
   if(!data?.length)throw new HttpError(409,'This draft changed. Reload before saving or publishing.','stale');return teacherDraft(actor,id);}
  case 'publish':{teacherOnly();const d=await teacherDraft(actor,z.string().uuid().parse(b.id));if(d.version!==b.version)throw new HttpError(409,'This draft changed. Reload before publishing.','stale');if(b.reviewed!==true)throw new HttpError(400,'Review all ten missions and their sources before assigning.');invalid(()=>validateStudy(d.content));
   for(let i=0;i<5;i++){const code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();const {error}=await adminClient().from('study_assignments').insert({code,draft_id:d.id,owner_id:actor.id,content:d.content,version:d.version});if(!error)return {code,version:d.version};if(error.code!=='23505')fromPg(error);}
   throw new HttpError(500,'Could not allocate a class code. Try again.');}
  case 'join':{const a=await assignment(String(b.code)),nickname=z.string().trim().min(1).max(30).parse(b.nickname),existing=await latestRun(actor,a.code);if(existing)return runState(actor,existing);
   const {data,error}=await adminClient().from('study_runs').insert({code:a.code,user_id:actor.id,nickname,missions:a.content.challenges}).select('id').single();if(error)fromPg(error);return runState(actor,data.id);}
 }
 const runId=await latestRun(actor,b.code?code6.parse(b.code):undefined);if(!runId)throw new HttpError(401,'Join a topic session first.','not-joined');
 const r=await runState(actor,runId);const required=(await assignment(r.code)).content.challenges.every(c=>r.completed.includes(c.id));
 if(b.action==='attempt'){
  // Graded on the server from the stored mission, never from a client correctness flag.
  const c=r.missions.find(c=>c.id===b.mission);if(!c)throw new HttpError(404,'Mission not found in this topic session.');const cargo=z.string().max(60).parse(b.cargo);
  let result;try{result=gradeCargo(c,cargo);}catch(e){throw new HttpError(400,e instanceof Error?e.message:'Invalid answer.');}
  const {error}=await adminClient().from('study_attempts').insert({run_id:r.id,mission_id:c.id,answer:cargo,correct:result.correct});if(error)fromPg(error);
  return {...result,state:await runState(actor,r.id)};
 }
 if(b.action==='finish'){if(!required)throw new HttpError(400,'Complete the ten assigned missions first.');const {error}=await adminClient().from('study_runs').update({finished_at:r.finished||new Date().toISOString()}).eq('id',r.id).eq('user_id',actor.id);if(error)fromPg(error);return runState(actor,r.id);}
 if(b.action==='more'){if(!required)throw new HttpError(400,'Complete the ten assigned missions before adding optional practice.');const a=await assignment(r.code);const batch=(r.missions.length-10)/10+1;
  const {error}=await adminClient().from('study_runs').update({missions:[...r.missions,...practiceBatch(a.content.challenges,batch)]}).eq('id',r.id).eq('user_id',actor.id);if(error)fromPg(error);return runState(actor,r.id);}
 throw new HttpError(400,'Unknown action.');
}

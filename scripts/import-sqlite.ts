// One-off migration from the original SQLite demo database (data/classpocket.sqlite) into Supabase.
// Usage: npm run import:sqlite -- path/to/classpocket.sqlite [--teacher <supabase-user-uuid>] [--dry-run]
//
// What is preserved: published gizmos (same IDs, so ?gizmo= links keep working), topic-session assignments and
// classroom publications (same class codes, so /study/CODE and /play/CODE keep working).
// What is not: old browser-cookie guest identities cannot be proven to belong to anyone, so their likes, comments,
// follows, timetables and rooms are not imported, and no login is invented for them. Imported posts are owned by a
// non-login "legacy archive" account and keep an attribution line naming the original handle. Assignments and
// lesson publications are attached to --teacher if given (a verified teacher account), otherwise left ownerless.
import {randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {admin} from './_env';
import {upgradeDefinition,GIZMO_SCHEMA_VERSION} from '../lib/gizmo-spec';
import {validateStudy} from '../lib/study';
import {validateLesson} from '../lib/model';
const args=process.argv.slice(2),file=args.find(a=>!a.startsWith('--')),dry=args.includes('--dry-run'),teacher=args[args.indexOf('--teacher')+1]&&args.includes('--teacher')?args[args.indexOf('--teacher')+1]:null;
if(!file){console.error('Usage: npm run import:sqlite -- data/classpocket.sqlite [--teacher <uuid>] [--dry-run]');process.exit(1);}
const sqlite=new DatabaseSync(file,{readOnly:true}),db=admin();
const has=(t:string)=>!!sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t);
const report={gizmos:0,skippedGizmos:0,assignments:0,publications:0,errors:[] as string[]};
async function archiveOwner(){
 const email='legacy-archive@classpocket.invalid';const {data:list}=await db.auth.admin.listUsers({page:1,perPage:200});let id=list?.users.find(u=>u.email===email)?.id;
 if(!id&&!dry){const {data,error}=await db.auth.admin.createUser({email,password:randomBytes(32).toString('base64url'),email_confirm:true,user_metadata:{purpose:'Owner of posts imported from the SQLite demo; not a login.'}});if(error)throw error;id=data.user.id;await db.from('profiles').update({handle:'legacy_archive',name:'Imported posts',bio:'Posts imported from the original ClassPocket demo.',is_guest:false}).eq('id',id);}
 return id||'00000000-0000-0000-0000-000000000000';
}
if(teacher&&!dry){const {data}=await db.from('user_roles').select('role').eq('user_id',teacher).eq('role','teacher');if(!data?.length){console.error('--teacher must be an existing account with the teacher role.');process.exit(1);}}
if(has('social_posts')){
 const owner=await archiveOwner();
 for(const r of sqlite.prepare('SELECT id,content,version,created FROM social_posts').all() as {id:string;content:string;version:number;created:string}[]){
  try{const raw=JSON.parse(r.content);if(!raw.published){report.skippedGizmos++;continue;}const id=String(r.id).toLowerCase();if(!/^[a-z0-9][a-z0-9-]{2,99}$/.test(id))throw new Error(`id ${r.id} cannot be kept`);
   const def={...upgradeDefinition(raw),attribution:`Originally published by @${raw.creator} in the first ClassPocket demo`.slice(0,200)};
   if(!dry){await db.from('gizmo_drafts').upsert({id,owner_id:owner,definition:def,schema_version:GIZMO_SCHEMA_VERSION,version:r.version||1},{onConflict:'id'});
    const {error}=await db.from('gizmos').upsert({id,owner_id:owner,authored:false,creator_handle:'legacy_archive',is_public:true,definition:def,schema_version:GIZMO_SCHEMA_VERSION,published_version:r.version||1,published_at:r.created,feed_sort:r.created,subject:def.subject,engine:def.engine,title:def.title,caption:def.caption},{onConflict:'id'});if(error)throw error;}
   report.gizmos++;}catch(e){report.errors.push(`gizmo ${r.id}: ${(e as Error).message}`);}
 }
}
if(has('study_assignments'))for(const r of sqlite.prepare('SELECT code,content,version,created FROM study_assignments').all() as {code:string;content:string;version:number;created:string}[]){
 if(['PHYS02','CHEM02'].includes(r.code))continue;
 try{const content=validateStudy(JSON.parse(r.content));if(!dry){const {error}=await db.from('study_assignments').upsert({code:r.code,content,version:r.version,owner_id:teacher,draft_id:null,created_at:r.created},{onConflict:'code',ignoreDuplicates:true});if(error)throw error;}report.assignments++;}catch(e){report.errors.push(`assignment ${r.code}: ${(e as Error).message}`);}
}
if(has('publications'))for(const r of sqlite.prepare('SELECT code,version,content,created FROM publications').all() as {code:string;version:number;content:string;created:string}[]){
 try{const content=validateLesson(JSON.parse(r.content));if(!dry){const {error}=await db.from('lesson_publications').upsert({code:r.code,version:r.version,content,owner_id:teacher,lesson_id:null,created_at:r.created},{onConflict:'code',ignoreDuplicates:true});if(error)throw error;}report.publications++;}catch(e){report.errors.push(`publication ${r.code}: ${(e as Error).message}`);}
}
console.log(JSON.stringify({dryRun:dry,...report},null,2));
if(report.errors.length)process.exitCode=2;

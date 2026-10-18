// Direct database/API attempts with the public publishable key, as a malicious browser would make them.
import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {admin,anonClient,guestClient,teacherClient,uuid,makePdf,type Client} from './helpers';
import {planetHopTemplate} from '../../lib/gizmos';
import {demoSchedule} from '../../lib/rhythm';
let A:{client:Client;id:string},B:{client:Client;id:string},draftId:string,roomCode:string;
const def=(()=>{const {id,creator,published,authored,feedRank,owned,version,counts,...d}=planetHopTemplate;void id;void creator;void published;void authored;void feedRank;void owned;void version;void counts;return d;})();
const denied=(r:{error:{code?:string;message:string}|null},why:string)=>assert.ok(r.error,`expected denial: ${why}`);
before(async()=>{
 A=await guestClient();B=await guestClient();draftId=`g-${uuid().replace(/-/g,'').slice(0,18)}`;
 const a=admin();
 assert.equal((await a.rpc('save_gizmo_draft',{p_actor:A.id,p_id:draftId,p_definition:def,p_schema_version:2,p_expected_version:0,p_provenance:{kind:'manual'},p_note:'rls test'})).error,null);
 assert.equal((await a.rpc('save_schedule',{p_actor:A.id,p_content:demoSchedule('UTC')})).error,null);
 assert.equal((await a.rpc('begin_generation',{p_actor:A.id,p_request_id:uuid(),p_kind:'gizmo',p_model:'m',p_prompt_chars:5,p_user_daily:100,p_global_daily:100000})).error,null);
 const room=await A.client.rpc('create_room',{p_gizmo:draftId});assert.equal(room.error,null);roomCode=room.data;
});
test('private rows are invisible to other users: drafts, versions, timetables, rooms, AI requests',async()=>{
 for(const [table,col] of [['gizmo_drafts','owner_id'],['gizmo_versions','owner_id'],['schedules','user_id'],['rooms','owner_id'],['generation_requests','user_id']] as const){
  const own=await A.client.from(table).select('*').eq(col,A.id);assert.equal(own.error,null,table);assert.ok(own.data!.length>0,`owner sees ${table}`);
  const other=await B.client.from(table).select('*').eq(col,A.id);assert.equal(other.error,null);assert.equal(other.data!.length,0,`${table} leaked`);
 }
 assert.equal((await B.client.from('room_members').select('*').eq('code',roomCode)).data!.length,0,'room membership is private');
 assert.equal((await B.client.from('gizmos').select('id').eq('id',draftId)).data!.length,0,'unpublished draft not in public table');
 assert.equal((await anonClient().from('profiles').select('id')).data?.length??0,0,'signed-out callers read no profiles');
 assert.equal((await B.client.from('usage_counters').select('*')).data?.length??0,0);
});
test('browser roles cannot write validated content tables directly',async()=>{
 denied(await B.client.from('gizmos').insert({id:'g-hack000000000000001',owner_id:B.id,authored:false,creator_handle:'x',definition:{},schema_version:2,subject:'Physics',engine:'jumper',title:'x'}),'insert gizmos');
 denied(await B.client.from('gizmo_drafts').insert({id:'g-hack000000000000002',owner_id:B.id,definition:{},schema_version:2}),'insert drafts');
 denied(await B.client.from('schedules').insert({user_id:B.id,content:{}}),'insert schedule');
 denied(await B.client.from('study_attempts').insert({run_id:uuid(),mission_id:'m',answer:'x',correct:true}),'forge study attempt');
 denied(await B.client.from('classroom_attempts').insert({session_id:uuid(),activity_id:'a',correct:true,answer:{},feedback:''}),'forge classroom attempt');
 const counters=await B.client.from('gizmos').update({like_count:9999}).eq('id','lunar-drift');denied(counters,'edit counters');
 const steal=await B.client.from('profiles').update({name:'pwned'}).eq('id',A.id).select('id');assert.equal(steal.data?.length??0,0,'cannot edit another profile');
 denied(await B.client.from('profiles').update({is_guest:false}).eq('id',B.id),'cannot change protected profile columns');
});
test('server-only functions cannot be called from the browser',async()=>{
 for(const [fn,args] of [['save_gizmo_draft',{p_actor:B.id,p_id:draftId,p_definition:{},p_schema_version:2,p_expected_version:1,p_provenance:{},p_note:''}],['publish_gizmo',{p_actor:A.id,p_id:draftId,p_expected_version:1}],['begin_generation',{p_actor:B.id,p_request_id:uuid(),p_kind:'gizmo',p_model:'m',p_prompt_chars:1,p_user_daily:1e6,p_global_daily:1e6}],['save_schedule',{p_actor:A.id,p_content:{}}],['save_lesson',{p_actor:B.id,p_id:null,p_content:{},p_expected_version:0}],['has_role',{p_user:A.id,p_role:'teacher'}]] as const)
  denied(await B.client.rpc(fn,args),fn);
});
test('teacher authority cannot be self-granted or attached to a guest identity',async()=>{
 denied(await B.client.from('user_roles').insert({user_id:B.id,role:'teacher'}),'self-grant');
 const viaService=await admin().from('user_roles').insert({user_id:B.id,role:'teacher'});assert.ok(viaService.error&&/Anonymous/.test(viaService.error.message),'anonymous users can never hold roles');
 denied(await B.client.rpc('share_schedule',{p_kind:'teacher'}),'non-teacher managed timetable');
 assert.equal((await B.client.rpc('is_teacher')).data,false);
});
test('room and timetable codes only grant what they say: membership, not ownership',async()=>{
 assert.equal((await B.client.rpc('join_room',{p_code:roomCode})).error,null);
 const visible=await B.client.from('rooms').select('code,snapshot').eq('code',roomCode).single();assert.equal(visible.error,null);
 assert.equal((await B.client.from('room_members').select('user_id').eq('code',roomCode)).data!.length,2);
 const edit=await B.client.from('rooms').update({snapshot:{}}).eq('code',roomCode).select('code');assert.ok(edit.error||!edit.data?.length,'members cannot edit the snapshot');
 assert.equal((await B.client.from('gizmo_drafts').select('id').eq('id',draftId)).data!.length,0,'membership does not reveal the source draft');
});
test('managed timetables: students cannot unlink themselves; only the publishing teacher can release them',async()=>{
 const T=await teacherClient(),a=admin();
 assert.equal((await a.rpc('save_schedule',{p_actor:T.id,p_content:demoSchedule('UTC')})).error,null);
 const code=(await T.client.rpc('share_schedule',{p_kind:'teacher'})).data as string;assert.match(code,/^[A-F0-9]{12}$/);
 assert.equal((await B.client.rpc('join_schedule',{p_code:code})).error,null);
 denied(await B.client.rpc('join_schedule',{p_code:code}),'cannot re-join/replace while managed');
 denied(await a.rpc('save_schedule',{p_actor:B.id,p_content:demoSchedule('UTC')}),'cannot save own timetable while managed');
 denied(await B.client.from('schedules').update({managed_code:null}).eq('user_id',B.id),'cannot unlink via REST');
 denied(await A.client.rpc('release_enrolment',{p_code:code,p_student:B.id}),'other users cannot release');
 const T2=await teacherClient();denied(await T2.client.rpc('release_enrolment',{p_code:code,p_student:B.id}),'another teacher cannot release');
 const state=(await B.client.rpc('schedule_state')).data;assert.equal(state.link.code,code);
 const roster=(await T.client.rpc('teacher_enrolments')).data as {students:{id:string}[]}[];assert.ok(roster[0].students.some(s=>s.id===B.id));
 assert.equal((await T.client.rpc('release_enrolment',{p_code:code,p_student:B.id})).error,null);
 assert.equal((await B.client.rpc('schedule_state')).data.link,null);
});
test('lesson PDFs: only teachers upload, only into their own folder, and nobody reads another teacher’s file',async()=>{
 const T=await teacherClient(),T2=await teacherClient(),pdf=makePdf([['Force: A push or pull acting on an object.']]);
 denied(await B.client.storage.from('lesson-sources').createSignedUploadUrl(`${B.id}/${uuid()}.pdf`),'guests cannot upload');
 denied(await T.client.storage.from('lesson-sources').createSignedUploadUrl(`${T2.id}/${uuid()}.pdf`),'not into another folder');
 const path=`${T.id}/${uuid()}.pdf`;const sign=await T.client.storage.from('lesson-sources').createSignedUploadUrl(path);assert.equal(sign.error,null);
 assert.equal((await T.client.storage.from('lesson-sources').uploadToSignedUrl(path,sign.data!.token,pdf,{contentType:'application/pdf'})).error,null);
 assert.ok((await T2.client.storage.from('lesson-sources').download(path)).error,'other teacher cannot read');
 assert.ok((await B.client.storage.from('lesson-sources').download(path)).error,'guest cannot read');
 const wrongType=`${T.id}/${uuid()}.pdf`,s2=await T.client.storage.from('lesson-sources').createSignedUploadUrl(wrongType);
 assert.ok((await T.client.storage.from('lesson-sources').uploadToSignedUrl(wrongType,s2.data!.token,Buffer.from('hello'),{contentType:'text/plain'})).error,'bucket rejects non-PDF types');
 await T.client.storage.from('lesson-sources').remove([path]);
});
test('creator shares: owners see their own links; browsers cannot mint, revoke or remix through the database',async()=>{
 const a=admin(),token='a'.repeat(8)+uuid().replace(/-/g,'').slice(0,32)+'b'.repeat(8);
 assert.equal((await a.rpc('create_share',{p_actor:A.id,p_gizmo:draftId,p_version:1,p_visibility:'private',p_token:token})).error,null);
 assert.equal((await A.client.from('creator_shares').select('token').eq('token',token)).data!.length,1);
 assert.equal((await B.client.from('creator_shares').select('token').eq('token',token)).data!.length,0,'other users cannot list share tokens');
 assert.equal((await B.client.rpc('creator_share',{p_token:token})).data.gizmo.title,planetHopTemplate.title,'holding the token is enough to play');
 denied(await B.client.from('creator_shares').insert({token:'c'.repeat(48),gizmo_id:draftId,version:1,owner_id:B.id,snapshot:{},visibility:'public'}),'insert share');
 denied(await B.client.from('creator_shares').update({revoked:true}).eq('token',token).select('token').then(r=>r.data?.length?r:{error:{message:'no rows'}}),'revoke via REST');
 for(const [fn,args] of [['create_share',{p_actor:B.id,p_gizmo:draftId,p_version:1,p_visibility:'public',p_token:'d'.repeat(48)}],['revoke_share',{p_actor:A.id,p_token:token}],['remix_share',{p_actor:B.id,p_token:token,p_id:'g-000000000000000000'}],['unpublish_gizmo',{p_actor:A.id,p_id:draftId}]] as const)denied(await B.client.rpc(fn,args),fn);
 denied(await B.client.from('creator_forks').insert({gizmo_id:draftId,parent_id:'x',parent_version:1,parent_token:token,parent_creator:'x',parent_title:'x'}),'forge lineage');
});

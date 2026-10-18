// End-to-end API journeys over HTTP against a running ClassPocket server (local or deployed).
import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {Browser,teacherAccount,uuid} from './helpers';
import {planetHopTemplate} from '../../lib/gizmos';
import type {Schedule} from '../../lib/rhythm';
const strip=(g:Record<string,unknown>)=>{const {id,creator,published,authored,feedRank,owned,version,counts,...d}=g;void id;void creator;void published;void authored;void feedRank;void owned;void version;void counts;return d;};
const gizmo=strip(planetHopTemplate as unknown as Record<string,unknown>);
function slotNow(subject:string):Schedule{const now=new Date(),m=now.getUTCHours()*60+now.getUTCMinutes(),f=(x:number)=>x>=1440?'24:00':`${String(Math.floor(x/60)).padStart(2,'0')}:${String(x%60).padStart(2,'0')}`;
 return {title:`${subject} now`,timezone:'UTC',enabled:true,slots:[{id:'now',name:`${subject} class`,subject:subject as Schedule['slots'][number]['subject'],days:[now.getUTCDay()],start:f(Math.max(0,m-5)),end:f(Math.min(1440,m+30))}]};}
let A:Browser,B:Browser;
before(async()=>{A=new Browser();B=new Browser();await A.guest();await B.guest();});
test('requests need a session and a trusted origin',async()=>{
 const anon=new Browser();assert.equal((await anon.get('/api/social')).status,401);assert.equal((await anon.get('/api/feed')).status,401);
 assert.equal((await A.post('/api/social',{action:'reaction',post:'lunar-drift',kind:'like',on:true},'https://evil.example')).status,403);
 assert.equal((await A.post('/api/social',{action:'reaction',post:'lunar-drift',kind:'like',on:true},null)).status,403);
});
test('owners publish; others see the snapshot but cannot open, edit or publish the draft',async()=>{
 const saved=await A.post('/api/social',{action:'save',id:null,version:0,gizmo:{...gizmo,title:'Owner test hop'}});assert.equal(saved.status,200,JSON.stringify(saved.data));
 const id=saved.data.draft.id,v=saved.data.draft.version;assert.equal(saved.data.draft.provenance.kind,'manual');
 assert.equal((await B.get(`/api/social?draft=${id}`)).status,404);
 assert.equal((await B.post('/api/social',{action:'save',id,version:v,gizmo})).status,403);
 assert.equal((await B.post('/api/social',{action:'publish',id,version:v})).status,403);
 assert.equal((await A.post('/api/social',{action:'publish',id,version:v})).status,200);
 const seen=await B.get(`/api/feed?id=${id}`);assert.equal(seen.status,200);assert.equal(seen.data.post.title,'Owner test hop');assert.equal(seen.data.post.owned,false);
 // Later draft edits don't leak into the public snapshot until republished.
 assert.equal((await A.post('/api/social',{action:'save',id,version:v,gizmo:{...gizmo,title:'Secret draft title'}})).status,200);
 assert.equal((await B.get(`/api/feed?id=${id}`)).data.post.title,'Owner test hop');
 assert.equal((await A.post('/api/social',{action:'publish',id,version:v})).status,409,'stale publish is rejected');
});
test('reactions are unique, idempotent and counted from real users',async()=>{
 const post='spring-theory',count=async()=>(await A.get(`/api/feed?id=${post}`)).data.post.counts.like;const start=await count();
 for(const _ of [1,2])assert.equal((await A.post('/api/social',{action:'reaction',post,kind:'like',on:true})).status,200);
 assert.equal(await count(),start+1);
 await B.post('/api/social',{action:'reaction',post,kind:'like',on:true});assert.equal(await count(),start+2);
 await B.post('/api/social',{action:'reaction',post,kind:'like',on:false});await B.post('/api/social',{action:'reaction',post,kind:'like',on:false});assert.equal(await count(),start+1);
 const saved=(await A.post('/api/social',{action:'reaction',post,kind:'save',on:true})).data;assert.ok(saved.count>=1);
 assert.ok((await A.get('/api/social?list=save')).data.posts.some((p:{id:string})=>p.id===post));
 const clientId=uuid(),text=`the whole mesh wobbles! ${clientId.slice(0,6)}`;for(const _ of [1,2])await B.post('/api/social',{action:'comment',post,text,clientId});
 assert.equal((await A.get(`/api/social?comments=${post}`)).data.comments.filter((c:{text:string})=>c.text===text).length,1);
});
test('profiles: handles are unique and personas are reserved',async()=>{
 const handle=`maker_${uuid().slice(0,6)}`;assert.equal((await A.post('/api/social',{action:'profile',profile:{handle,name:'Alex',bio:'hi'}})).status,200);
 assert.equal((await B.post('/api/social',{action:'profile',profile:{handle:handle.toUpperCase(),name:'B',bio:''}})).status,409);
 assert.equal((await B.post('/api/social',{action:'profile',profile:{handle:'orbitclub',name:'B',bio:''}})).status,409);
 assert.equal((await B.get(`/api/social?profile=${handle}`)).data.profile.name,'Alex');
});
test('invite rooms: real membership, immutable snapshot, independent of later edits',async()=>{
 const saved=await A.post('/api/social',{action:'save',id:null,version:0,gizmo:{...gizmo,title:'Room original'}}),id=saved.data.draft.id;
 const room=await A.post('/api/rhythm',{action:'room-create',post:id});assert.equal(room.status,200);const code=room.data.invite.code;
 assert.equal((await B.get(`/api/rhythm?room=${code}`)).status,404,'non-members cannot open the room');
 assert.equal((await B.post('/api/rhythm',{action:'room-join',code})).status,200);
 const members=(await A.get('/api/rhythm')).data.rooms.find((r:{code:string})=>r.code===code).members;assert.equal(members.length,2);
 await A.post('/api/social',{action:'save',id,version:1,gizmo:{...gizmo,title:'Room edited later'}});
 assert.equal((await B.get(`/api/rhythm?room=${code}`)).data.post.title,'Room original');
 assert.equal((await B.post('/api/rhythm',{action:'room-create',post:id})).status,403,'members cannot fork the owner’s draft');
});
test('the server applies the timetable: class subject only, preview cannot widen it, direct links stay open',async()=>{
 const C=new Browser();await C.guest();
 assert.equal((await C.post('/api/rhythm',{action:'schedule-save',schedule:slotNow('Chemistry')})).status,200);
 for(const q of ['mode=for-you','mode=following','mode=learn','q=lunar','mode=for-you&preview=1:770']){const f=await C.get(`/api/feed?${q}`);assert.equal(f.data.policy.subject,'Chemistry',q);assert.equal(f.data.posts.length,0,`no Physics during Chemistry (${q})`);}
 assert.equal((await C.get('/api/feed?id=lunar-drift')).status,200,'an explicit link is not blocked');
 assert.equal((await C.post('/api/rhythm',{action:'schedule-save',schedule:slotNow('Physics')})).status,200);
 const physics=await C.get('/api/feed?mode=for-you');assert.equal(physics.data.policy.source,'class');assert.ok(physics.data.posts.length>0);assert.ok(physics.data.posts.every((p:{subject:string})=>p.subject==='Physics'));
 assert.equal((await C.post('/api/rhythm',{action:'schedule-save',schedule:{...slotNow('Physics'),enabled:false}})).status,200);
 const preview=await C.get('/api/feed?mode=for-you&preview=1:590');assert.equal(preview.data.policy.subject,'Chemistry');assert.equal(preview.data.policy.source,'preview');
 const bad=await C.post('/api/rhythm',{action:'schedule-save',schedule:{...slotNow('Physics'),slots:[...slotNow('Physics').slots,{...slotNow('Maths').slots[0],id:'x'}]}});assert.equal(bad.status,400,'overlaps rejected');
});
test('teacher-managed timetables update for students who cannot edit, replace or unlink them',async()=>{
 const t=await teacherAccount(),T=new Browser(),S=new Browser(),Other=new Browser();await T.guest();await T.signIn(t.email,t.password);await S.guest();await Other.guest();
 const ts=slotNow('Physics');assert.equal((await T.post('/api/rhythm',{action:'schedule-save',schedule:ts})).status,200);
 const share=await T.post('/api/rhythm',{action:'schedule-share',kind:'teacher'});assert.equal(share.status,200);const code=share.data.shared.code;
 assert.equal((await Other.post('/api/rhythm',{action:'schedule-share',kind:'teacher'})).status,403);
 await Other.post('/api/rhythm',{action:'schedule-save',schedule:slotNow('Maths')});const personal=(await Other.post('/api/rhythm',{action:'schedule-share',kind:'personal'})).data.shared.code;
 assert.equal((await S.post('/api/rhythm',{action:'schedule-join',code})).status,200);
 let s=(await S.get('/api/rhythm')).data;assert.equal(s.link.code,code);assert.equal(s.effective.title,ts.title);
 assert.equal((await S.post('/api/rhythm',{action:'schedule-save',schedule:slotNow('Art')})).status,403);
 assert.equal((await S.post('/api/rhythm',{action:'schedule-join',code:personal})).status,403);
 assert.equal((await T.post('/api/rhythm',{action:'schedule-save',schedule:{...ts,title:'Updated by teacher'}})).status,200);
 s=(await S.get('/api/rhythm')).data;assert.equal(s.effective.title,'Updated by teacher');
 const sid=(await S.get('/api/session')).data.user.id;assert.ok((await T.get('/api/rhythm')).data.enrolments[0].students.some((x:{id:string})=>x.id===sid));
 assert.equal((await T.post('/api/rhythm',{action:'schedule-release',code,student:sid})).status,200);
 assert.equal((await S.post('/api/rhythm',{action:'schedule-save',schedule:slotNow('Art')})).status,200);
});

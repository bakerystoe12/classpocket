// Teacher lesson flows: topic sessions with server grading, classroom lessons, and >4.5 MB PDF uploads via storage.
import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {Browser,teacherAccount,makePdf,admin,anonClient} from './helpers';
import {solution} from '../unit/study-solutions';
import type {Challenge} from '../../lib/study';
let T:Browser,S:Browser,teacherId:string;
before(async()=>{const t=await teacherAccount();teacherId=t.id;T=new Browser();await T.guest();await T.signIn(t.email,t.password);S=new Browser();await S.guest();});
test('ten required missions graded on the server, then optional same-topic practice; results are real records',async()=>{
 assert.equal((await S.post('/api/study',{action:'create',sample:'physics'})).status,403,'students cannot create sessions');
 const d=await T.post('/api/study',{action:'create',sample:'physics'});assert.equal(d.status,200);
 assert.equal((await T.post('/api/study',{action:'publish',id:d.data.id,version:d.data.version,reviewed:false})).status,400);
 const pub=await T.post('/api/study',{action:'publish',id:d.data.id,version:d.data.version,reviewed:true});assert.equal(pub.status,200);const code=pub.data.code;
 const peek=await S.get(`/api/study?code=${code}`);assert.equal(peek.data.needsJoin,true);assert.deepEqual(peek.data.assignment.content.pages,[],'students never receive the full source pages');
 let run=(await S.post('/api/study',{action:'join',code,nickname:'Sam'})).data;assert.equal(run.missions.length,10);
 const first:Challenge=run.missions[0];
 const wrong=await S.post('/api/study',{action:'attempt',code,mission:first.id,cargo:first.game?'not-a-valid-answer':first.choices.find((c:string)=>c!==first.target)});assert.ok(wrong.status===400||wrong.data.correct===false);
 assert.equal((await S.post('/api/study',{action:'more',code})).status,400,'practice is locked until the ten are done');
 assert.equal((await S.post('/api/study',{action:'finish',code})).status,400);
 for(const m of run.missions as Challenge[]){const r=await S.post('/api/study',{action:'attempt',code,mission:m.id,cargo:solution(m)});assert.equal(r.data.correct,true,m.id);}
 assert.ok((await S.post('/api/study',{action:'finish',code})).data.finished);
 run=(await S.post('/api/study',{action:'more',code})).data;assert.equal(run.missions.length,20);assert.ok(run.finished,'optional practice keeps the required completion');
 const results=(await T.get(`/api/study?teacher=1&id=${d.data.id}&results=1`)).data;const r=results[0].runs.find((x:{nickname:string})=>x.nickname==='Sam');
 assert.ok(r.finished);assert.ok(r.attempts.length>=10);assert.ok(r.attempts.some((a:{correct:number})=>a.correct===1));
 assert.equal((await S.get(`/api/study?teacher=1&id=${d.data.id}&results=1`)).status,403);
});
test('a PDF larger than the 4.5 MB function body limit uploads straight to storage and is extracted',async()=>{
 const pdf=makePdf([['Force: A push or pull that can change how an object moves.','Mass: The amount of matter in an object, measured in kilograms.'],['Weight: The gravitational force on a mass, measured in newtons.','Friction: A force that opposes sliding between two surfaces.']],6*1024*1024);
 assert.ok(pdf.length>4.5*1024*1024,`pdf is ${pdf.length} bytes`);
 assert.equal((await S.post('/api/uploads',{filename:'notes.pdf',size:pdf.length,type:'application/pdf'})).status,403,'students cannot upload');
 assert.equal((await T.post('/api/uploads',{filename:'huge.pdf',size:11*1024*1024,type:'application/pdf'})).status,413);
 assert.equal((await T.post('/api/uploads',{filename:'slides.pptx',size:1000,type:'application/vnd.ms-powerpoint'})).status,415);
 const sign=await T.post('/api/uploads',{filename:'forces.pdf',size:pdf.length,type:'application/pdf'});assert.equal(sign.status,200);
 const up=await anonClient().storage.from(sign.data.bucket).uploadToSignedUrl(sign.data.path,sign.data.token,pdf,{contentType:'application/pdf'});assert.equal(up.error,null,up.error?.message);
 const draft=await T.post('/api/study',{action:'extract',path:sign.data.path,filename:'forces.pdf',title:'Forces',category:'Physics'});assert.equal(draft.status,200,JSON.stringify(draft.data));
 assert.equal(draft.data.content.pages.length,2);assert.ok(draft.data.content.challenges.some((c:{target:string;page:number})=>c.target==='Weight'&&c.page===2),'page references preserved');
 const left=await admin().storage.from('lesson-sources').list(teacherId);assert.equal(left.data?.length??0,0,'uploaded source is deleted after extraction');
 assert.equal((await T.post('/api/study',{action:'extract',path:`${'0'.repeat(8)}-0000-0000-0000-000000000000/x.pdf`})).status,403,'cannot extract another user’s path');
});
test('scanned or unreadable PDFs get a clear paste-text alternative',async()=>{
 const blank=makePdf([[' ']]);const sign=await T.post('/api/uploads',{filename:'scan.pdf',size:blank.length,type:'application/pdf'});
 await anonClient().storage.from(sign.data.bucket).uploadToSignedUrl(sign.data.path,sign.data.token,blank,{contentType:'application/pdf'});
 const r=await T.post('/api/study',{action:'extract',path:sign.data.path,filename:'scan.pdf',title:'Scan',category:'Physics'});assert.equal(r.status,422);assert.match(r.data.error,/paste/i);
});
test('classroom lessons: publish an immutable snapshot, students join with a nickname, attempts are graded server-side',async()=>{
 const lesson=await T.post('/api/lessons',{sample:true});assert.equal(lesson.status,200);const id=lesson.data.id;
 assert.equal((await S.post('/api/lessons',{sample:true})).status,403);
 const pub=await T.post(`/api/lessons/${id}/publish`,{version:lesson.data.version,reviewed:true});assert.equal(pub.status,200);
 await T.req(`/api/lessons/${id}`,{method:'PUT',body:{version:lesson.data.version,content:{...lesson.data.content,title:'Edited after publishing'}}});
 assert.equal((await S.post('/api/join',{code:pub.data.code,nickname:'Riley'})).status,200);
 const play=await S.get(`/api/play/${pub.data.code}`);assert.notEqual(play.data.content.title,'Edited after publishing');
 const a=play.data.content.activities[0];const r=await S.post(`/api/play/${pub.data.code}/attempt`,{activity:a.id,answer:{prediction:'Clockwise',distance:.3}});assert.equal(r.status,200);assert.equal(typeof r.data.correct,'boolean');
 const results=(await T.get(`/api/lessons/${id}/results`)).data;assert.ok(results[0].attempts.some((x:{nickname:string})=>x.nickname==='Riley'));
});

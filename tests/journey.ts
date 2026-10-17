import assert from 'node:assert/strict';
import { pdf } from './fixtures';
const base=process.env.TEST_URL||'http://localhost:3000';
let teacherCookie='',studentCookie='';
async function request(path:string,body?:unknown,role='teacher',method?:string){const r=await fetch(`${base}/api/${path}`,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',Cookie:role==='teacher'?teacherCookie:role==='student'?studentCookie:''},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]||''};}
const login=await request('login',{password:process.env.TEACHER_PASSWORD||'classpocket-demo'});assert.equal(login.status,200);teacherCookie=login.cookie;
const created=await request('lessons',{sample:true});assert.equal(created.status,200);const id=created.data.id;let row=created.data;const original=row.content.activities[0].title;
row.content.activities[0].title='Edited activity';let saved=await request(`lessons/${id}`,{content:row.content,version:row.version},'teacher','PUT');assert.equal(saved.status,200);assert.equal(saved.data.version,2);
const stale=await request(`lessons/${id}`,{content:row.content,version:1},'teacher','PUT');assert.equal(stale.status,400);
const restored=await request(`lessons/${id}/restore`,{restoreVersion:1,version:2});assert.equal(restored.data.content.activities[0].title,original);assert.equal(restored.data.version,3);row=restored.data;
assert.equal((await request(`lessons/${id}/publish`,{version:3,reviewed:false})).status,400);
const published=await request(`lessons/${id}/publish`,{version:3,reviewed:true});assert.equal(published.status,200);const code=published.data.code;
assert.equal((await request(`lessons/${id}`,undefined,'anonymous')).status,403);
const join=await request('join',{code,nickname:'Journey test student'},'anonymous');assert.equal(join.status,200);studentCookie=join.cookie;
assert.equal((await request(`lessons/${id}`,undefined,'student')).status,403);assert.equal((await request(`lessons/${id}`,{version:3,content:row.content},'student','PUT')).status,403);assert.equal((await request(`lessons/${id}/publish`,{version:3,reviewed:true},'student')).status,403);
row.content.activities[0].title='Unpublished later edit';saved=await request(`lessons/${id}`,{version:3,content:row.content},'teacher','PUT');assert.equal(saved.status,200);
const play=await request(`play/${code}`,undefined,'student');assert.equal(play.data.content.activities[0].title,original);assert.equal(play.data.version,3);
assert.equal((await request(`play/${code}/complete`,{},'student')).status,400);
const wrong=await request(`play/${code}/attempt`,{activity:'balance',answer:{distance:1,prediction:'Balanced'}},'student');assert.equal(wrong.data.correct,false);
const answers=[{prediction:'Clockwise',distance:.3},{prediction:6,distance:3},{placements:[0,1,2]},{placements:[0,1,0]},{distance:2,prediction:'Balanced'},{distance:2,prediction:'Balanced'}];
for(const [i,a] of play.data.content.activities.entries()){const attempt=await request(`play/${code}/attempt`,{activity:a.id,answer:answers[i]},'student');assert.equal(attempt.status,200);assert.equal(attempt.data.correct,true,a.title);}
assert.equal((await request(`play/${code}/complete`,{},'student')).status,200);
const results=await request(`lessons/${id}/results`);assert.equal(results.data[0].students.length,1);assert.ok(results.data[0].students[0].completed);assert.equal(results.data[0].attempts.length,7);assert.equal(results.data[0].attempts[0].correct,0);
const remix=await request(`lessons/${id}/remix`,{});assert.notEqual(remix.data.id,id);assert.match(remix.data.content.attribution,/Remixed from/);
assert.equal((await request(`lessons/${id}/generate`,{version:4})).status,503);
assert.equal((await request('join',{code:'XXXXXX',nickname:'Invalid'},'anonymous')).status,400);
const pasted=await request('lessons',{title:'Pasted test',text:'Force produces a turning effect around a pivot.\n---\nMoment equals force times perpendicular distance.'});assert.equal(pasted.data.content.pages.length,2);assert.equal(pasted.data.content.activities.length,0);
for(const [name,data,expected] of [['readable.pdf',pdf('Moment equals force times perpendicular distance. Two newtons at three metres gives six newton metres.'),200],['scanned.pdf',pdf(''),422],['broken.pdf',Buffer.from('not a pdf'),422]] as const){const form=new FormData();form.set('file',new Blob([data]),name);const res=await fetch(`${base}/api/extract`,{method:'POST',headers:{Cookie:teacherCookie},body:form});const body=await res.json();assert.equal(res.status,expected,`${name}: ${JSON.stringify(body)}`);if(expected===200)assert.match(body.content.pages[0].text,/Moment equals/);}
console.log(`PASS: real API journey; editing, restore, stale writes, review gate, snapshot isolation, student permissions, 7 attempts, completion, results, remix, missing AI, paste and PDF extraction. Test class ${code}.`);

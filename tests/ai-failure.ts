import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:3001';
const login=await fetch(`${base}/api/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:process.env.TEACHER_PASSWORD||'classpocket-demo'})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!.split(';')[0];
const headers={'Content-Type':'application/json',Cookie:cookie};
const lesson=await (await fetch(`${base}/api/lessons`,{method:'POST',headers,body:JSON.stringify({sample:true})})).json();
const failed=await fetch(`${base}/api/lessons/${lesson.id}/generate`,{method:'POST',headers,body:JSON.stringify({version:lesson.version})});assert.equal(failed.status,502);assert.match((await failed.json()).error,/working draft is unchanged/);
const preserved=await (await fetch(`${base}/api/lessons/${lesson.id}`,{headers})).json();assert.equal(preserved.version,lesson.version);assert.deepEqual(preserved.content,lesson.content);
console.log('PASS: a real upstream AI request with an intentionally invalid test key fails safely; the draft and version remain unchanged.');

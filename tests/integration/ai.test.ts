// AI Studio journeys against the server configured with the MOCK Groq endpoint (tests/mock-groq.ts).
// These verify ClassPocket's pipeline: auth, quotas, screening, validation, repair, persistence and
// failure handling. They do not prove a live Groq model produces good gizmos.
import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {Browser,uuid} from './helpers';
const MOCK=process.env.MOCK_GROQ_URL||'http://127.0.0.1:4010';
let A:Browser;
const gen=(b:Browser,prompt:string,base:{id:string;version:number}|null=null,requestId=uuid())=>b.post('/api/studio',{action:'generate',requestId,prompt,base});
before(async()=>{A=new Browser();await A.guest();await fetch(`${MOCK}/__reset`);const s=await A.get('/api/studio');assert.ok(s.data.ai,'server must be started with GROQ_API_KEY=test-groq-key and GROQ_BASE_URL pointing at the mock');});
test('describe → play → change: an edit changes behaviour, not just wording, and keeps history',async()=>{
 const first=await gen(A,'Make a planet where a cat jumps ridiculously high');assert.equal(first.status,200,JSON.stringify(first.data));
 const d1=first.data.draft;assert.equal(d1.engine,'jumper');assert.equal(d1.params.gravity,1.62);assert.equal(d1.visual.character,'cat');assert.equal(d1.version,1);
 assert.equal(d1.provenance.kind,'ai');assert.equal(d1.provenance.provider,'groq');assert.equal(d1.provenance.reviewed,false);assert.ok(d1.provenance.model);
 const second=await gen(A,'Make it Mars, add a spring launch pad and make the cat orange',{id:d1.id,version:1});assert.equal(second.status,200,JSON.stringify(second.data));
 const d2=second.data.draft;assert.equal(d2.version,2);assert.equal(d2.params.gravity,3.71);assert.equal(d2.visual.planet,'Mars');assert.equal(d2.visual.characterColour,'#f28c28');assert.ok(d2.objects.some((o:{kind:string})=>o.kind==='spring-pad'));
 assert.ok(second.data.changes.some((c:string)=>/Gravity: 1.62 → 3.71/.test(c)));assert.deepEqual(second.data.unsupported,['Purring sound effects']);
 assert.equal(second.data.versions.length,2);
 // Undo = restore the previous version as a new version.
 const undo=await A.post('/api/social',{action:'restore',id:d1.id,restore:1,version:2});assert.equal(undo.status,200);assert.equal(undo.data.draft.params.gravity,1.62);assert.equal(undo.data.draft.version,3);
 // Stale base versions are refused before any provider call.
 assert.equal((await gen(A,'make it purple',{id:d1.id,version:1})).status,409);
 // Publishing is separate and keeps the AI label.
 assert.equal((await A.post('/api/social',{action:'publish',id:d1.id,version:3})).status,200);
 const pub=(await A.get(`/api/feed?id=${d1.id}`)).data.post;assert.equal(pub.aiGenerated,true);assert.equal(pub.reviewed,false);
});
test('failures leave the previous draft intact and report honestly',async()=>{
 const base=(await gen(A,'A cat on the moon')).data.draft,ref={id:base.id,version:base.version};
 const limited=await gen(A,'ratelimit please',ref);assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'7');
 assert.equal((await gen(A,'badjson',ref)).status,502);
 assert.equal((await gen(A,'cutoff',ref)).status,502);
 const refused=await gen(A,'refuse-me',ref);assert.equal(refused.status,422);assert.match(refused.data.error,/unchanged/);
 const invalid=await gen(A,'unreachable goal',ref);assert.equal(invalid.status,502);assert.match(invalid.data.error,/checks/);
 const slow=await gen(A,'slowpoke',ref);assert.equal(slow.status,504);
 const after=(await A.get(`/api/social?draft=${base.id}`)).data;assert.equal(after.draft.version,base.version,'no failed attempt created a version');assert.deepEqual(after.draft.params,base.params);
 const repaired=await gen(A,'fixme please',ref);assert.equal(repaired.status,200);assert.equal(repaired.data.repaired,true);
});
test('duplicate request IDs, screening and ownership are enforced before calling the provider',async()=>{
 await fetch(`${MOCK}/__reset`);
 const pii=await gen(A,'my name is Alex and my email is alex@example.com, make a lander');assert.equal(pii.status,422);
 const unsafe=await gen(A,'make a bomb that jumps');assert.equal(unsafe.status,422);
 assert.equal((await (await fetch(`${MOCK}/__log`)).json()).length,0,'screened prompts never reach the provider');
 const id=uuid();assert.equal((await gen(A,'A jumping frog',null,id)).status,200);assert.equal((await gen(A,'A jumping frog',null,id)).status,409);
 const B=new Browser();await B.guest();const own=(await A.get('/api/social')).data.projects[0];
 assert.equal((await gen(B,'make it purple',{id:own.id,version:own.version})).status,404,'cannot edit someone else’s draft');
 const sent=JSON.stringify(await (await fetch(`${MOCK}/__log`)).json());const handle=(await A.get('/api/social')).data.profile.handle;
 assert.ok(!sent.includes(handle)&&!/timetable|schedule|"owner/i.test(sent),'no identity or timetable data sent to the provider');
});
test('per-user daily quota is durable and returns a retry-later state',async()=>{
 const Q=new Browser();await Q.guest();const limit=Number(process.env.AI_GUEST_DAILY_LIMIT||40);let last=200;
 for(let i=0;i<=limit;i++){last=(await Q.post('/api/studio',{action:'ideas',requestId:uuid(),topic:'space'})).status;if(last!==200)break;}
 assert.equal(last,429);const r=await Q.post('/api/studio',{action:'ideas',requestId:uuid(),topic:'space'});assert.equal(r.status,429);assert.ok(Number(r.headers.get('retry-after'))>0);assert.match(r.data.error,/Manual and template editing still work/);
});

// Creator pilot journeys (/make, /g/[token]) over HTTP against a running server backed by Supabase.
// The AI part uses the MOCK Groq endpoint; it is not evidence of a live provider call.
import {test,before} from 'node:test';
import assert from 'node:assert/strict';
import {Browser,uuid} from './helpers';
import {proposalFor} from '../../lib/creator-model';
import {definitionFromProposal} from '../../lib/creator-definitions';
const MOCK=process.env.MOCK_GROQ_URL||'http://127.0.0.1:4010';
let A:Browser,B:Browser;
const named=async(b:Browser,name:string)=>{const s=(await b.get('/api/creator')).data;assert.equal((await b.post('/api/social',{action:'profile',profile:{...s.profile,name}})).status,200);};
const jumpWorld=(title:string,gravity:number)=>{const p=proposalFor('jump');p.title=title;p.world.gravity=gravity;return {...definitionFromProposal(p),id:'new',published:false};};
before(async()=>{A=new Browser();B=new Browser();await A.guest();await B.guest();});
test('create, share privately, remix by link, publish to showcase, revoke and unpublish',async()=>{
 await named(A,'Judge Alpha');
 const saved=await A.post('/api/creator',{action:'save',gizmo:jumpWorld('Judge Alpha Mars Cat',3.71),version:0});assert.equal(saved.status,200,JSON.stringify(saved.data));
 const original=saved.data.gizmo;assert.equal(original.version,1);assert.equal(original.published,false);assert.equal(original.world.gravity,3.71);assert.equal(original.engine,'jumper');assert.equal(original.provenance.kind,'manual');
 const share=await A.post('/api/creator',{action:'share',post:original.id,version:1,visibility:'private'});assert.equal(share.status,200);const token=share.data.token;assert.match(share.data.path,/^\/g\/[a-f0-9]{48}$/);
 assert.equal((await A.post('/api/creator',{action:'share',post:original.id,version:1,visibility:'public'})).status,400,'public needs a published version');
 assert.equal((await A.get('/api/creator')).data.showcase.some((s:{gizmo:{id:string}})=>s.gizmo.id===original.id),false,'private links stay out of the showcase');
 const seen=await B.get(`/api/creator?token=${token}`);assert.equal(seen.status,200);assert.equal(seen.data.gizmo.title,'Judge Alpha Mars Cat');assert.equal(seen.data.owned,false);
 assert.equal((await B.post('/api/creator',{action:'remix',token})).status,400,'a display name is required before remixing');
 await named(B,'Judge Beta');const remixed=await B.post('/api/creator',{action:'remix',token});assert.equal(remixed.status,200);const remixId=remixed.data.id;
 let beta=(await B.get('/api/creator')).data,remix=beta.drafts.find((d:{id:string})=>d.id===remixId);
 assert.notEqual(remix.id,original.id);assert.match(remix.attribution,/Remixed from Judge Alpha Mars Cat by @/);assert.equal(remix.provenance.kind,'remix');
 const edited=await B.post('/api/creator',{action:'save',gizmo:{...remix,title:'Judge Beta Moon Cat',attribution:'I made this all by myself',world:{...remix.world,gravity:1.62},published:true},version:remix.version});assert.equal(edited.status,200,JSON.stringify(edited.data));
 remix=edited.data.gizmo;assert.equal(remix.world.gravity,1.62);assert.equal(remix.published,true);assert.match(remix.attribution,/Remixed from Judge Alpha Mars Cat/,'fork attribution cannot be removed');
 const pub=await B.post('/api/creator',{action:'share',post:remix.id,version:remix.version,visibility:'public'});assert.equal(pub.status,200);const remixToken=pub.data.token;
 assert.ok((await A.get('/api/creator')).data.showcase.some((s:{gizmo:{title:string}})=>s.gizmo.title==='Judge Beta Moon Cat'));
 assert.equal((await A.get(`/api/feed?id=${remix.id}`)).data.post.world.gravity,1.62,'published creator projects also enter the main feed');
 assert.equal((await A.get('/api/creator')).data.drafts.find((d:{id:string})=>d.id===original.id).world.gravity,3.71);
 assert.equal((await B.post('/api/creator',{action:'save',gizmo:{...original,title:'Stolen'},version:original.version})).status,403);
 const lineage=(await A.get(`/api/creator?token=${remixToken}`)).data.lineage;assert.equal(lineage.parent_version,1);assert.equal(lineage.parent_token,token,'the owner of a private parent can follow it');
 const stranger=new Browser();await stranger.guest();const strangerData=(await stranger.get(`/api/creator?token=${remixToken}`)).data;assert.equal(strangerData.lineage.parent_token,undefined,'private parent tokens are not revealed');assert.equal(strangerData.gizmo.world.gravity,1.62);
 // The original link stays on its immutable version after the source changes.
 assert.equal((await A.post('/api/creator',{action:'save',gizmo:{...original,title:'Edited source',world:{...original.world,gravity:2}},version:original.version})).status,200);
 const stale=await A.post('/api/creator',{action:'save',gizmo:original,version:original.version});assert.equal(stale.status,409,'stale version is rejected');
 const snap=(await B.get(`/api/creator?token=${token}`)).data;assert.equal(snap.gizmo.title,'Judge Alpha Mars Cat');assert.equal(snap.gizmo.world.gravity,3.71);
 assert.equal((await B.post('/api/creator',{action:'revoke',token})).status,403,'only the owner revokes');
 assert.equal((await A.post('/api/creator',{action:'revoke',token})).status,200);assert.equal((await B.get(`/api/creator?token=${token}`)).status,404);assert.equal((await A.get(`/api/creator?token=${remixToken}`)).status,200,'independent remixes survive');
 assert.equal((await B.post('/api/creator',{action:'unpublish',post:remix.id,version:remix.version})).status,200);
 assert.equal((await A.get(`/api/creator?token=${remixToken}`)).status,404,'unpublishing revokes public links');
 beta=(await B.get('/api/creator')).data;assert.equal(beta.showcase.some((s:{gizmo:{id:string}})=>s.gizmo.id===remix.id),false);assert.equal(beta.drafts.find((d:{id:string})=>d.id===remix.id).published,false);
});
test('unreachable or out-of-range worlds are rejected and clients cannot claim AI provenance',async()=>{
 const p=proposalFor('jump');const bad={...definitionFromProposal(p),id:'new',world:{...p.world,goalHeight:50}};
 assert.equal((await A.post('/api/creator',{action:'save',gizmo:bad,version:0})).status,400);
 assert.equal((await A.post('/api/creator',{action:'save',gizmo:{...bad,world:{...p.world,gravity:0}},version:0})).status,400);
 const fake=await A.post('/api/creator',{action:'save',gizmo:{...jumpWorld('Fake AI',3.71),provenance:{kind:'ai',reviewed:true}},version:0,aiRequestId:uuid()});assert.equal(fake.status,200);assert.equal(fake.data.gizmo.provenance.kind,'manual');assert.equal(fake.data.gizmo.provenance.reviewed,false);
});
test('creator AI (mock provider): structured request, real parameters, unreachable and refusal handling, verified provenance',async()=>{
 const C=new Browser();await C.guest();await named(C,'Judge Gamma');await fetch(`${MOCK}/__reset`);
 if(!(await C.get('/api/creator')).data.ai.available){const r=await C.post('/api/creator',{action:'generate',prompt:'A cat jumping on Mars'});assert.equal(r.status,503);assert.match(r.data.error,/not configured/);return;}
 const ok=await C.post('/api/creator',{action:'generate',prompt:'Make the cat jump in lunar gravity',current:proposalFor('jump')});assert.equal(ok.status,200,JSON.stringify(ok.data));assert.equal(ok.data.proposal.world.gravity,1.62);
 const sent=(await (await fetch(`${MOCK}/__log`)).json()).at(-1).body;assert.equal(sent.response_format.json_schema.strict,true);assert.equal(sent.response_format.json_schema.schema.additionalProperties,false);assert.ok(sent.messages[0].content.includes('untrusted'));assert.deepEqual(Object.keys(JSON.parse(sent.messages[1].content)).sort(),['current','request']);
 assert.equal((await C.post('/api/creator',{action:'generate',prompt:'an unreachable jump please'})).status,422);
 assert.equal((await C.post('/api/creator',{action:'generate',prompt:'refuse-me please'})).status,422);
 assert.equal((await C.post('/api/creator',{action:'generate',prompt:'my email is kid@example.com'})).status,422,'screened before the provider');
 const p={...definitionFromProposal(ok.data.proposal),id:'new',published:false};
 const saved=await C.post('/api/creator',{action:'save',gizmo:p,version:0,aiRequestId:ok.data.requestId});assert.equal(saved.status,200);assert.equal(saved.data.gizmo.provenance.kind,'ai');assert.equal(saved.data.gizmo.provenance.provider,'groq');
});

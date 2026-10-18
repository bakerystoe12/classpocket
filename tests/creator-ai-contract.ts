// Provider responses below are simulated. This does not certify a live Groq call.
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {proposalFor} from '../lib/creator-model';
assert.match(process.env.DATA_DIR||'',/creator-ai-qa/,'Use an isolated creator-ai-qa directory.');
const {GET,POST}=await import('../app/api/creator/route');
const init=await GET(new NextRequest('http://localhost/api/creator'));const cookie=init.headers.get('set-cookie')!.split(';')[0];
const originalKey=process.env.GROQ_API_KEY,originalFetch=globalThis.fetch;let calls=0;
try{
 process.env.GROQ_API_KEY='test-placeholder-not-a-real-key';
 globalThis.fetch=async(input,options)=>{
  calls++;assert.equal(input,'https://api.groq.com/openai/v1/chat/completions');const sent=JSON.parse(String(options?.body));assert.equal(sent.response_format.json_schema.strict,true);assert.equal(sent.response_format.json_schema.schema.additionalProperties,false);assert.ok(sent.messages[0].content.includes('untrusted'));assert.deepEqual(Object.keys(JSON.parse(sent.messages[1].content)).sort(),['current','request']);
  if(calls===3)return Response.json({choices:[{finish_reason:'stop',message:{refusal:'Unsupported request'}}]});
  const p=proposalFor('jump');p.world.gravity=calls===1?1.62:25;
  return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify(p)}}]});
 };
 const request=()=>POST(new NextRequest('http://localhost/api/creator',{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify({action:'generate',prompt:'Make the cat jump in lunar gravity',current:proposalFor('jump')})}));
 const valid=await request();assert.equal(valid.status,200);assert.equal((await valid.json()).proposal.world.gravity,1.62);
 const unreachable=await request();assert.equal(unreachable.status,422);assert.match((await unreachable.json()).error,/unreachable/);
 const refused=await request();assert.equal(refused.status,422);
 const limited=await request();assert.equal(limited.status,429);assert.equal(calls,3);
 delete process.env.GROQ_API_KEY;const absent=await request();assert.equal(absent.status,503);assert.equal(calls,3);
 console.log('PASS: simulated Groq structured request, actual parameter response, unreachable-result rejection, refusal handling, durable quota and honest missing-key response. No live provider call was made.');
}finally{globalThis.fetch=originalFetch;if(originalKey===undefined)delete process.env.GROQ_API_KEY;else process.env.GROQ_API_KEY=originalKey;}

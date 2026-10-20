// Simulated provider responses. No paid Anthropic call is made by this suite.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {structured} from '../../lib/ai/provider';
import {buildCustom} from '../../lib/ai/custom-build';
import {aiConfig,type AiConfig} from '../../lib/env';
import {starterProgram} from '../../lib/custom-program';
const cfg:AiConfig={provider:'anthropic',apiKey:'test-not-a-real-key',model:'claude-sonnet-5-5',baseUrl:'https://api.anthropic.com/v1',timeoutMs:3000,maxOutputTokens:10000,userDaily:5,guestDaily:2,globalDaily:20,maxPromptChars:600};
const sample={refused:false,refusalReason:'',subject:'History',title:'History time machine',caption:'The printing press has entered the chat.',objective:'Explore how inventions change communication.',instructions:'Tap Add 1 or Add 2 to explore a sequence.',assumptions:['Authored test content; dates are not model-verified.'],accent:'#c4a5ff',html:starterProgram.html,css:starterProgram.css,javascript:starterProgram.javascript,changeSummary:'Created a time machine toy.',unsupported:[]};
const answer=(value:unknown,stop_reason='end_turn')=>Response.json({stop_reason,content:[{type:'thinking',thinking:'not user content'},{type:'text',text:JSON.stringify(value)}],usage:{input_tokens:8000,output_tokens:4000}});
const input={system:'rules',user:'idea',schema:{type:'object'},name:'test'};
test('Anthropic Messages request has server-only auth, structured output and correct token accounting',async()=>{
 const fetcher:typeof fetch=async(url,options)=>{assert.equal(url,'https://api.anthropic.com/v1/messages');const headers=options!.headers as Record<string,string>;assert.equal(headers['x-api-key'],cfg.apiKey);assert.equal(headers['anthropic-version'],'2023-06-01');const sent=JSON.parse(String(options!.body));assert.equal(sent.model,cfg.model);assert.equal(sent.max_tokens,10000);assert.equal(sent.system,'rules');assert.equal(sent.output_config.format.type,'json_schema');assert.equal(sent.thinking.type,'adaptive');assert.equal(sent.output_config.effort,'medium');return answer({hello:'world'});};
 const result=await structured(cfg,{...input,fetcher});assert.ok(result.ok);if(result.ok){assert.deepEqual(result.json,{hello:'world'});assert.deepEqual(result.usage,{input:8000,output:4000});}
});
test('rate limiting, refusal, truncation, invalid JSON and configuration errors do not expose provider details',async()=>{
 const limit=await structured(cfg,{...input,fetcher:async()=>new Response('',{status:429,headers:{'retry-after':'7'}})});assert.equal(limit.ok,false);if(!limit.ok){assert.equal(limit.retryAfter,7);assert.equal(limit.code,'rate-limited');}
 for(const reason of ['refusal','max_tokens']){const result=await structured(cfg,{...input,fetcher:async()=>answer({},reason)});assert.equal(result.ok,false);if(!result.ok)assert.equal(result.usage?.output,4000);}
 const auth=await structured(cfg,{...input,fetcher:async()=>Response.json({error:{message:'secret-provider-detail'}},{status:401})});assert.ok(!auth.ok);assert.ok(!JSON.stringify(auth).includes('secret-provider-detail'));
 const malformed=await structured(cfg,{...input,fetcher:async()=>Response.json({stop_reason:'end_turn',content:[{type:'text',text:'no json'}]})});assert.equal(malformed.ok,false);
 const timeout=await structured(cfg,{...input,fetcher:async()=>{throw new DOMException('timed out','TimeoutError');}});assert.ok(!timeout.ok);if(!timeout.ok)assert.equal(timeout.code,'timeout');
});
test('custom creation and follow-up edits carry program state without identity',async()=>{
 const first=await buildCustom(cfg,{prompt:'Make an interactive history timeline',base:null,subject:null,fetcher:async()=>answer(sample)});assert.ok(first.ok);if(!first.ok)return;assert.equal(first.definition.engine,'custom');assert.equal(first.definition.subject,'History');
 const edited=await buildCustom(cfg,{prompt:'Add a reset button',base:first.definition,subject:null,fetcher:async(_,options)=>{const request=JSON.parse(JSON.parse(String(options!.body)).messages[0].content);assert.equal(request.current.program.javascript,starterProgram.javascript);assert.ok(!JSON.stringify(request).includes('provenance'));return answer({...sample,javascript:sample.javascript+';console.log("edited")'});}});assert.ok(edited.ok);if(edited.ok)assert.match(edited.definition.program!.javascript,/edited/);
});
test('invalid syntax gets exactly one bounded repair; failed builds retain accounting',async()=>{
 let calls=0;const fixed=await buildCustom(cfg,{prompt:'A little counting garden',base:null,subject:null,fetcher:async(_,options)=>{calls++;if(calls===2)assert.match(String(options!.body),/Repair your previous/);return answer({...sample,javascript:calls===1?'const = broken':sample.javascript});}});assert.ok(fixed.ok);if(fixed.ok){assert.equal(fixed.repaired,true);assert.deepEqual(fixed.usage,{input:16000,output:8000});}assert.equal(calls,2);
 calls=0;const invalid=await buildCustom(cfg,{prompt:'A counting garden',base:null,subject:null,fetcher:async()=>{calls++;return answer({...sample,html:'<script>bad()</script>'});}});assert.equal(invalid.ok,false);assert.equal(calls,2);assert.equal(invalid.usage.output,8000);
 calls=0;const refused=await buildCustom(cfg,{prompt:'unavailable feature',base:null,subject:null,fetcher:async()=>{calls++;return answer({...sample,refused:true,refusalReason:'Try a different idea.'});}});assert.equal(refused.ok,false);assert.equal(calls,1);
});
test('configuration selects Claude without silently falling back to Groq',()=>{
 const names=['AI_PROVIDER','AI_ENABLED','ANTHROPIC_API_KEY','ANTHROPIC_MODEL','GROQ_API_KEY','AI_MAX_OUTPUT_TOKENS'],old=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 try{process.env.AI_PROVIDER='anthropic';process.env.AI_ENABLED='true';delete process.env.AI_MAX_OUTPUT_TOKENS;process.env.GROQ_API_KEY='groq-test';delete process.env.ANTHROPIC_API_KEY;assert.equal(aiConfig(),null);process.env.ANTHROPIC_API_KEY='claude-test';assert.equal(aiConfig()?.provider,'anthropic');assert.equal(aiConfig()?.maxOutputTokens,10000);process.env.AI_ENABLED='false';assert.equal(aiConfig(),null);}finally{for(const n of names)if(old[n]===undefined)delete process.env[n];else process.env[n]=old[n];}
});

// Pipeline contract with simulated Supabase RPC/storage and simulated Claude. Not a real RLS test.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateGizmo} from '../../lib/server/studio';
import type {Actor} from '../../lib/server/auth';
import {blankSchedule} from '../../lib/rhythm';
import {starterProgram} from '../../lib/custom-program';
type Stored={id:string;owner_id:string;definition:unknown;version:number};
test('Claude pipeline persists versions only after validation, keeps failures unchanged, and rejects stale/foreign requests before calling AI',async()=>{
 const names=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SECRET_KEY','AI_PROVIDER','ANTHROPIC_API_KEY','ANTHROPIC_MODEL','AI_ENABLED'];const old=Object.fromEntries(names.map(n=>[n,process.env[n]])),originalFetch=globalThis.fetch;
 const store=new Map<string,Stored>(),seen=new Set<string>(),ledger=new Map<string,Record<string,unknown>>();let providerCalls=0,limit=false;
 const asActor=(id:string):Actor=>({id,isAnonymous:true,isTeacher:false,supabase:{rpc:async()=>({data:{own:blankSchedule(),effective:blankSchedule(),link:null,isTeacher:false},error:null}),from:(table:string)=>{let key='';const query:{select:()=>unknown;eq:(_column:string,value:string)=>unknown;order:()=>unknown;limit:()=>unknown;maybeSingle:()=>Promise<unknown>;then:(resolve:(r:unknown)=>unknown)=>unknown}={select:()=>query,eq:(_column,value)=>{if(_column==='id'||_column==='gizmo_id')key=value;return query;},order:()=>query,limit:()=>query,maybeSingle:async()=>({data:table==='gizmos'?null:store.get(key)?.owner_id===id?store.get(key):null,error:null}),then:resolve=>Promise.resolve({data:table==='gizmo_versions'&&store.get(key)?.owner_id===id?[{version:store.get(key)!.version,created_at:new Date().toISOString(),note:'Mock version',kind:'ai'}]:[],error:null}).then(resolve)};return query;}} as unknown as Actor['supabase']});
 const result={refused:false,refusalReason:'',subject:'English',title:'Poetry robot',caption:'The robot is learning metaphors.',objective:'Explore playful word combinations.',instructions:'Tap to add to the poem.',assumptions:['A creative language toy.'],accent:'#c4a5ff',html:starterProgram.html,css:starterProgram.css,javascript:starterProgram.javascript,changeSummary:'Built a word toy.',unsupported:[]};
 const provider:typeof fetch=async()=>{providerCalls++;return Response.json({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(result)}],usage:{input_tokens:100,output_tokens:200}});};
 try{
  Object.assign(process.env,{NEXT_PUBLIC_SUPABASE_URL:'https://classpocket-test.supabase.co',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'test-publishable',SUPABASE_SECRET_KEY:'test-secret',AI_PROVIDER:'anthropic',ANTHROPIC_API_KEY:'test-claude',ANTHROPIC_MODEL:'claude-sonnet-5-5',AI_ENABLED:'true'});
  globalThis.fetch=async(url,options)=>{const u=new URL(String(url));assert.equal(u.host,'classpocket-test.supabase.co','only mocked database transport is allowed');const b=JSON.parse(String(options?.body||'{}'));
   if(u.pathname.endsWith('/begin_generation')){if(seen.has(b.p_request_id))return Response.json({ok:false,reason:'duplicate'});if(limit)return Response.json({ok:false,reason:'global-quota'});seen.add(b.p_request_id);ledger.set(b.p_request_id,{status:'pending'});return Response.json({ok:true,userRemaining:4});}
   if(u.pathname.endsWith('/generation_requests')){const id=u.searchParams.get('request_id')!.replace(/^eq\./,'');ledger.set(id,{...ledger.get(id),...b});return new Response(null,{status:204});}
   if(u.pathname.endsWith('/save_gizmo_draft')){const before=store.get(b.p_id);assert.equal(before?.version||0,b.p_expected_version);const row={id:b.p_id,owner_id:b.p_actor,definition:b.p_definition,version:(before?.version||0)+1};store.set(row.id,row);return Response.json(row.version);}
   if(u.pathname.endsWith('/finish_generation')){ledger.set(b.p_request_id,{...ledger.get(b.p_request_id),status:b.p_status,input:b.p_input_tokens,output:b.p_output_tokens});return new Response(null,{status:204});}
   throw new Error('Unexpected mocked request '+u.pathname);
  };
  const actor=asActor('00000000-0000-4000-8000-000000000001'),request={requestId:crypto.randomUUID(),prompt:'A poetry robot',base:null};
  const created=await generateGizmo(actor,request,provider);assert.equal(created.draft.engine,'custom');assert.equal(created.draft.subject,'English');assert.equal(created.draft.version,1);assert.equal(created.draft.provenance.provider,'anthropic');assert.equal(ledger.get(request.requestId)!.provider,'anthropic');assert.equal(ledger.get(request.requestId)!.output,200);
  const ref={id:created.draft.id,version:1};const edit=await generateGizmo(actor,{...request,requestId:crypto.randomUUID(),prompt:'Make it a word garden',base:ref},provider);assert.equal(edit.draft.version,2);
  const count=providerCalls;await assert.rejects(()=>generateGizmo(actor,{...request,requestId:crypto.randomUUID(),base:ref},provider),/another tab/);assert.equal(providerCalls,count);
  await assert.rejects(()=>generateGizmo(asActor('other'),{...request,requestId:crypto.randomUUID(),base:{...ref,version:2}},provider),/Only its owner/);assert.equal(providerCalls,count);
  await assert.rejects(()=>generateGizmo(actor,request,provider),/already received/);assert.equal(providerCalls,count);
  await assert.rejects(()=>generateGizmo(actor,{...request,requestId:crypto.randomUUID(),prompt:'email me at kid@example.com'},provider),/email/);assert.equal(providerCalls,count);
  const failedId=crypto.randomUUID();await assert.rejects(()=>generateGizmo(actor,{...request,requestId:failedId,base:{...ref,version:2}},async()=>Response.json({error:{}},{status:429})),/busy|limit/);assert.equal(store.get(ref.id)!.version,2);assert.equal(ledger.get(failedId)!.status,'failed');
  limit=true;await assert.rejects(()=>generateGizmo(actor,{...request,requestId:crypto.randomUUID()},provider),/budget/);assert.equal(providerCalls,count);
 }finally{globalThis.fetch=originalFetch;for(const n of names)if(old[n]===undefined)delete process.env[n];else process.env[n]=old[n];}
});

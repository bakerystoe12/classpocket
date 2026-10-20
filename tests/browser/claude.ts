// Browser/UI verification with simulated API persistence/provider responses. No paid AI or live DB.
import {chromium,type BrowserContext,type Page} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {customTemplate} from '../../lib/gizmos';
import type {Gizmo} from '../../lib/gizmo-spec';
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3010';
const browser=await chromium.launch({channel:'msedge',headless:true});
const A=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),B=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
const drafts=new Map<string,Gizmo>(),versions=new Map<string,{version:number;created:string;note:string;kind:string}[]>(),owners=new Map<string,string>(),shares=new Map<string,Gizmo>();const requests:Record<string,unknown>[]=[];const errors:string[]=[];
let sequence=0,token=0;
function response(draft:Gizmo){return {draft,versions:versions.get(draft.id)||[],publishedVersion:draft.published?draft.version:null};}
function save(g:Gizmo,owner:string){const id=g.id||'g-'+String(++sequence).padStart(18,'0'),version=(drafts.get(id)?.version||0)+1,d={...g,id,version,owned:true};drafts.set(id,d);owners.set(id,owner);versions.set(id,[{version,created:new Date().toISOString(),note:'Simulated test save',kind:d.provenance.kind},...versions.get(id)||[]]);return d;}
async function intercept(context:BrowserContext,owner:string){await context.route('**/api/**',async route=>{const req=route.request(),url=new URL(req.url()),path=url.pathname,b=req.method()==='POST'?req.postDataJSON():{};requests.push({path,...b});let data:unknown={},status=200;
 if(path==='/api/session')data={configured:{backend:true,ai:true,demo:true},user:{id:owner}};
 else if(path==='/api/studio'&&req.method()==='GET')data={ai:{provider:'Claude',model:'claude-sonnet-5-5',custom:true}};
 else if(path==='/api/social'&&req.method()==='GET'){
  if(url.searchParams.has('draft')){const d=drafts.get(url.searchParams.get('draft')!);data=d?response(d):{error:'Missing draft'};status=d?200:404;}
  else data={profile:{handle:owner,name:'Demo maker',bio:''},projects:[...drafts.values()].filter(d=>owners.get(d.id)===owner).map(d=>({id:d.id,title:d.title,version:d.version}))};
 }else if(path==='/api/studio'){
  if(b.prompt.includes('rate limit')){status=429;data={error:'Claude is busy or at its usage limit.',code:'ai-rate-limited'};}
  else{const prior=b.base?drafts.get(b.base.id):null;let program={...prior?.program||customTemplate.program!};
   if(b.prompt.includes('broken'))program={...program,javascript:'throw new Error("Test runtime failure")'};
   else if(b.runtimeError)program={...customTemplate.program!};
   else if(prior)program={...program,javascript:program.javascript.replace('String(++n)','String(n+=2)')};
   const d=save({...customTemplate,...prior,id:prior?.id||'',title:prior?.title||'Fraction goblin',caption:'Tap and compare equal groups.',subject:'Maths',program,provenance:{kind:'ai',provider:'anthropic',model:'claude-sonnet-5-5',reviewed:false}},owner);data={...response(d),changes:['Changed the interactive program.'],summary:'Simulated response',unsupported:[]};}
 }else if(path==='/api/social'&&b.action==='publish'){const d={...drafts.get(b.id)!,published:true};drafts.set(d.id,d);data=response(d);}
 else if(path==='/api/social'&&b.action==='save')data=response(save({...b.gizmo,id:b.id||'',version:b.version},owner));
 else if(path==='/api/creator'&&b.action==='share'){const t=String(++token).padStart(48,'a');shares.set(t,structuredClone(drafts.get(b.post)!));data={path:'/g/'+t};}
 else if(path==='/api/creator'&&b.action==='remix'){const source=shares.get(b.token)!;const d=save({...source,id:'',title:source.title+' remix',published:false,provenance:{kind:'remix',reviewed:false},attribution:'Remixed from '+source.title},owner);data={id:d.id};}
 else if(path==='/api/creator'&&url.searchParams.has('token'))data={gizmo:shares.get(url.searchParams.get('token')!),version:1,visibility:'private',owned:false,lineage:null};
 else if(path==='/api/creator')data={profile:{name:'Demo maker',handle:owner},drafts:[],showcase:[],shares:[],ai:{available:true,provider:'Claude'}};
 else{status=400;data={error:'Unexpected test request '+path};}
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
 });}
await intercept(A,'maker-a');await intercept(B,'maker-b');const p=await A.newPage(),q=await B.newPage();p.on('pageerror',e=>{if(!e.message.includes('Test runtime failure'))errors.push(e.message);});q.on('pageerror',e=>errors.push(e.message));
mkdirSync('test-results',{recursive:true});
try{
 await p.goto(base+'/studio');await p.getByRole('button',{name:'Describe',exact:true}).click();await p.getByLabel('Describe it',{exact:true}).fill('Make a fraction goblin with counters');await p.getByRole('button',{name:'Create with AI',exact:true}).click();
 let iframe=p.locator('.generated-gizmo iframe');await iframe.waitFor();let game=p.frameLocator('.generated-gizmo iframe');await game.getByRole('button',{name:'Add 1',exact:true}).click();await game.locator('#count').filter({hasText:'1'}).waitFor();
 assert.equal(await iframe.getAttribute('sandbox'),'allow-scripts');assert.equal(await iframe.getAttribute('referrerpolicy'),'no-referrer');
 await p.getByLabel('Change it',{exact:true}).fill('Make the first button add two');await p.getByRole('button',{name:'Change it with AI',exact:true}).click();game=p.frameLocator('.generated-gizmo iframe');await game.getByRole('button',{name:'Add 1',exact:true}).click();await game.locator('#count').filter({hasText:'2'}).waitFor();
 await p.getByRole('button',{name:'Versions',exact:true}).click();await p.getByText('Version 2 · current',{exact:true}).waitFor();await p.getByRole('button',{name:'Describe',exact:true}).click();
 await p.getByLabel('Change it',{exact:true}).fill('rate limit please');await p.getByRole('button',{name:'Change it with AI',exact:true}).click();await p.getByRole('alert').filter({hasText:'usage limit'}).waitFor();assert.equal(drafts.values().next().value?.version,2);
 await p.getByLabel('Change it',{exact:true}).fill('Make a broken runtime test');await p.getByRole('button',{name:'Change it with AI',exact:true}).click();await p.getByRole('button',{name:'Repair gizmo with Claude',exact:true}).waitFor();await p.getByRole('button',{name:'Repair gizmo with Claude',exact:true}).click();await p.frameLocator('.generated-gizmo iframe').getByRole('button',{name:'Add 2',exact:true}).click();await p.frameLocator('.generated-gizmo iframe').locator('#count').filter({hasText:'2'}).waitFor();
 await p.getByRole('button',{name:'Publish gizmo',exact:true}).click();await p.getByRole('button',{name:'Published',exact:true}).waitFor();
 await p.getByRole('button',{name:/Share saved version/}).click();const link=await p.getByLabel('Gizmo snapshot link').inputValue();await q.goto(link);await q.getByRole('heading',{name:'Fraction goblin',exact:true}).waitFor();await q.getByRole('button',{name:'Remix this gizmo',exact:true}).click();await q.waitForURL('**/studio?draft=*');await q.getByRole('heading',{name:'Fraction goblin remix',exact:true}).waitFor();
 await q.getByRole('button',{name:'Describe',exact:true}).click();await q.getByLabel('Change it',{exact:true}).fill('Change my remix');await q.getByRole('button',{name:'Change it with AI',exact:true}).click();assert.equal(drafts.size,2);const originals=[...drafts.values()];assert.equal(originals[0].version,4);assert.equal(originals[1].version,2);assert.notEqual(owners.get(originals[0].id),owners.get(originals[1].id));
 assert.ok(requests.some(r=>typeof r.runtimeError==='string'&&r.runtimeError.includes('Test runtime failure')));
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await q.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await q.screenshot({path:'test-results/claude-studio-mobile.png',fullPage:true});await q.locator('.generated-gizmo iframe').scrollIntoViewIfNeeded();await q.screenshot({path:'test-results/claude-studio-preview.png'});
 await p.reload();await p.getByRole('heading',{name:'Fraction goblin',exact:true}).waitFor();await p.getByRole('button',{name:'New gizmo',exact:true}).click();await p.locator('.generated-gizmo iframe').waitFor();
 // CSP is the boundary even when a source check is bypassed. No network or parent-document access.
 const malicious={...customTemplate.program!,html:'<output id="boundary">waiting</output>',javascript:'let out=document.getElementById("boundary");try{window["par"+"ent"].document.body.dataset.pwned="yes";out.textContent="unsafe"}catch{out.textContent="parent blocked"}window["fe"+"tch"]("https://example.invalid/leak").catch(()=>out.textContent+="; network blocked");'};
 const {programDocument}=await import('../../lib/custom-program');const frame=p.locator('.generated-gizmo iframe');await p.frameLocator('.generated-gizmo iframe').getByRole('button',{name:'Add 1',exact:true}).waitFor();await frame.scrollIntoViewIfNeeded();const existing=(await frame.getAttribute('srcdoc'))!,channel=JSON.parse(existing.match(/const channel=("[^"]+")/)![1]),nonce=existing.match(/script nonce="([^"]+)"/)![1];await frame.evaluate((el,doc)=>el.setAttribute('srcdoc',doc),programDocument(malicious,channel,'boundary',nonce));
 await p.frameLocator('.generated-gizmo iframe').locator('#boundary').filter({hasText:'parent blocked; network blocked'}).waitFor({state:'attached'});assert.equal(await p.evaluate(()=>document.body.dataset.pwned),undefined);
 assert.deepEqual(errors,[]);console.log('PASS: simulated two-user custom create/play/edit, runtime repair, rate-limit preservation, version history, publish, private snapshot, independent remix, reload, mobile layout, opaque-origin and CSP boundaries. No live Claude or Supabase call was made.');
}catch(e){await p.screenshot({path:'test-results/claude-studio-failure.png',fullPage:true});throw e;}finally{await browser.close();}

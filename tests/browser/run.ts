// Browser journey: two independent browser profiles against a running server.
// For the AI steps the server must use the MOCK Groq endpoint (see TESTING in README); the journey labels that.
import {chromium,type Page} from 'playwright';
import {mkdirSync,existsSync} from 'node:fs';
import assert from 'node:assert/strict';
const BASE=process.env.TEST_BASE_URL||'http://localhost:3000',OUT='test-results';mkdirSync(OUT,{recursive:true});
const executablePath=existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined;
const browser=await chromium.launch({executablePath});
const errors:string[]=[];
const watch=(p:Page,who:string)=>{p.on('pageerror',e=>errors.push(`${who}: ${e.message}`));p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|status of 4\d\d/.test(m.text()))errors.push(`${who} console: ${m.text()}`);});};
const step=async(name:string,fn:()=>Promise<void>)=>{const t=Date.now();await fn();console.log(`✓ ${name} (${Date.now()-t} ms)`);};
const noOverflow=async(p:Page,label:string)=>assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`${label}: horizontal overflow`);
const a=await browser.newContext({viewport:{width:390,height:844},permissions:['clipboard-read','clipboard-write']}),A=await a.newPage();watch(A,'A');
// Scrolls the feed (exercising keyset pagination) until a post is mounted.
const findPost=async(p:Page,id:string)=>{for(let i=0;i<20;i++){const el=p.locator(`#post-${id}`);if(await el.count()){await el.scrollIntoViewIfNeeded();await p.waitForTimeout(400);return el;}await p.locator('.social-feed').evaluate(f=>f.scrollTo({top:f.scrollHeight}));await p.waitForTimeout(700);}throw new Error(`post ${id} never loaded`);};
const enterWelcome=async(p:Page,expect:RegExp)=>{const d=p.getByRole('dialog',{name:/class|feed is ready|Physics/i});await d.waitFor({timeout:20000});assert.match(await d.innerText(),expect);return d;};
await step('welcome gates the feed, traps focus and makes the background inert',async()=>{
 await A.goto(BASE);const d=await enterWelcome(A,/Explore|learn/i);
 assert.equal(await A.locator('[data-post]').count(),0,'feed is not mounted behind the welcome');
 assert.equal(await A.locator('.social-phone-shell').getAttribute('inert'),'');
 const focused=await A.evaluate(()=>document.activeElement?.textContent||'');assert.match(focused,/Explore Physics|learn/);
 for(let i=0;i<4;i++)await A.keyboard.press('Tab');assert.ok(await d.evaluate((el)=>el.contains(document.activeElement)),'focus stays inside the dialog');
 await A.screenshot({path:`${OUT}/01-welcome.png`});
 await A.getByRole('button',{name:/Explore Physics|Let’s learn/}).click();await A.locator('[data-post]').first().waitFor();
 await noOverflow(A,'mobile feed');await A.screenshot({path:`${OUT}/02-feed.png`});
});
await step('three contrasting interactions respond to input',async()=>{
 const first=await findPost(A,'particle-universe');const canvas=first.locator('canvas');const box=(await canvas.boundingBox())!;
 await A.mouse.move(box.x+box.width/2,box.y+box.height/2);await A.mouse.down();await A.mouse.move(box.x+40,box.y+90,{steps:8});await A.mouse.up();
 await first.getByRole('button',{name:'Burst'}).click();
 const goblin=await findPost(A,'electron-goblin');await goblin.getByRole('button',{name:'+ electron'}).click();
 assert.match(await goblin.locator('.widget-readout').innerText(),/3 protons − 4 electrons = -1 charge/);
 const lander=await findPost(A,'lunar-drift');const thrust=lander.getByRole('button',{name:'Thrust'});
 await thrust.dispatchEvent('pointerdown',{pointerId:1});await A.waitForTimeout(700);await thrust.dispatchEvent('pointerup',{pointerId:1});
 await A.waitForTimeout(300);assert.match(await lander.locator('[role=status]').innerText(),/Fuel \d+\.\d s/);
 await A.screenshot({path:`${OUT}/03-goblin-lander.png`});
});
await step('the demo bell switches the feed: Physics → Chemistry (honest empty state) → free time',async()=>{
 const preview=async(label:RegExp)=>{await A.getByRole('button',{name:/right now|Your time/}).first().click();const sheet=A.getByRole('dialog');await sheet.getByRole('button',{name:label}).click();await sheet.getByRole('button',{name:'Close panel'}).click();};
 await preview(/09:10 Physics/);await enterWelcome(A,/Physics/);await A.screenshot({path:`${OUT}/04-physics-welcome.png`});await A.getByRole('button',{name:/Let’s learn Physics/}).click();
 await A.getByText('PHYSICS ONLY').waitFor();
 await preview(/09:50 Chemistry/);await enterWelcome(A,/Chemistry/);await A.getByRole('button',{name:/Let’s learn Chemistry/}).click();
 await A.getByRole('heading',{name:/Chemistry is on your timetable/}).waitFor();assert.equal(await A.locator('[data-post]').count(),0,'no Physics disguised as Chemistry');await A.screenshot({path:`${OUT}/05-chemistry-empty.png`});
 await preview(/12:50 Free time/);await enterWelcome(A,/Explore|ready/i);await A.getByRole('button',{name:/Explore Physics/}).click();await A.locator('[data-post]').first().waitFor();
 await A.getByRole('button',{name:/Your time/}).click();await A.getByRole('dialog').getByRole('button',{name:'Use real clock'}).click();await A.getByRole('dialog').getByRole('button',{name:'Close panel'}).click();
 const back=A.getByRole('dialog',{name:/feed is ready|class/i});if(await back.isVisible().catch(()=>false))await A.getByRole('button',{name:/Explore Physics|Let’s learn/}).click();
});
let invite='';
await step('Studio: describe it with AI (mock provider), play it, change it, publish it',async()=>{
 const ai=(await (await A.request.get(`${BASE}/api/studio`)).json()).ai;
 await A.getByRole('button',{name:'Studio'}).click();await A.getByLabel('Describe a gizmo').fill('Make a planet where a cat jumps ridiculously high');await A.getByLabel('Create from idea').click();
 const sheet=A.getByRole('dialog',{name:'Gizmo studio'});
 if(!ai){await sheet.getByText('AI creation isn’t configured').waitFor();console.log('  (AI not configured on this server: verified the honest fallback only)');await sheet.getByRole('button',{name:'Save draft'}).click();}
 else{
  await sheet.getByRole('button',{name:/Create with AI/}).click();await sheet.getByText('What changed').waitFor({timeout:30000});
  await sheet.getByRole('button',{name:'Jump',exact:true}).click();await A.waitForTimeout(500);
  await sheet.getByRole('textbox',{name:/Change it/}).fill('Make it Mars, add a spring launch pad and make the cat orange');await sheet.getByRole('button',{name:/Change it with AI/}).click();
  await sheet.getByText(/Gravity: 1.62 → 3.71/).waitFor({timeout:30000});assert.match(await sheet.locator('.builder-result').innerText(),/spring-pad/);assert.match(await sheet.locator('.builder-result').innerText(),/Not built/);
  assert.match(await sheet.locator('svg[role=img]').getAttribute('aria-label')||'',/Mars/);await A.screenshot({path:`${OUT}/06-ai-edit.png`});
 }
 await sheet.getByRole('button',{name:/Publish gizmo/}).click();await A.getByText(/Published/).first().waitFor();
 await sheet.getByRole('button',{name:'Close panel'}).click();
 await A.getByRole('button',{name:'Friends'}).click();await A.getByLabel('Gizmo to invite friends to').selectOption({index:1});await A.getByRole('button',{name:/Create invite link/}).click();
 invite=await A.getByLabel('Gizmo invite link').inputValue();assert.match(invite,/\?room=[A-F0-9]{12}$/);
});
const b=await browser.newContext({viewport:{width:390,height:844}}),B=await b.newPage();watch(B,'B');
await step('a friend in another browser joins the snapshot with real, persisted membership',async()=>{
 await B.goto(invite);await B.getByLabel('Gizmo room code').waitFor();await B.getByRole('button',{name:'Join gizmo room'}).click();
 await B.getByText(/You joined this room · 2 people/).waitFor();await B.getByRole('button',{name:/Open gizmo/}).first().click();
 await B.getByRole('dialog').getByText(/not synchronised multiplayer/).waitFor();assert.ok(await B.getByRole('dialog').locator('svg[role=img],canvas').count()>0);await B.screenshot({path:`${OUT}/07-friend-room.png`});
 await A.reload();await enterWelcome(A,/./);await A.keyboard.press('Escape');await A.getByRole('button',{name:'Friends'}).click();await A.getByText(/You invited this room · 2 people/).waitFor({timeout:15000});
});
await step('timetable save persists across reload',async()=>{
 await A.getByRole('button',{name:'Home'}).click();await A.getByRole('button',{name:/right now|Your time/}).first().click();const sheet=A.getByRole('dialog');
 await sheet.getByRole('button',{name:'Use demo school day'}).click();await sheet.getByRole('button',{name:'Save timetable'}).click();await A.getByText('Timetable saved').waitFor();
 await A.reload();await enterWelcome(A,/./);await A.keyboard.press('Escape');await A.getByRole('button',{name:/right now|Your time/}).first().click();assert.equal(await A.getByRole('dialog').getByLabel('Class 1 name').inputValue(),'Physics lab');await A.getByRole('dialog').getByRole('button',{name:'Close panel'}).click();
});
await step('capture downloads a real PNG of the interaction',async()=>{
 const post=await findPost(A,'particle-universe');const [download]=await Promise.all([A.waitForEvent('download'),post.getByRole('button',{name:/^Capture/}).click()]);
 assert.match(download.suggestedFilename(),/\.png$/);const path=`${OUT}/capture.png`;await download.saveAs(path);
});
await step('creator pilot: make, share privately with QR, remix in another browser, publish to the showcase',async()=>{
 const c=await browser.newContext({viewport:{width:390,height:844}}),C=await c.newPage();watch(C,'C');await C.goto(BASE);await enterWelcome(C,/./);
 await C.getByRole('button',{name:/Try the creator demo/}).click();await C.getByLabel('Creator display name').fill('Judge Alpha');await C.getByRole('button',{name:'Start creating',exact:true}).click();await C.getByText('Creating as',{exact:false}).waitFor();
 await C.getByRole('button',{name:'New experiment',exact:true}).click();await C.getByLabel('Creator gizmo name',{exact:true}).fill('Judge Alpha Mars Cat');await C.getByLabel('Starting Gravity (m/s²)',{exact:true}).fill('3.71');
 await C.getByRole('button',{name:'Launch cat',exact:true}).click();await C.getByRole('status').filter({hasText:'peak 3.37 m'}).waitFor();
 await C.getByRole('button',{name:'Share privately',exact:true}).click();const link=C.getByLabel('Gizmo snapshot link',{exact:true});await link.waitFor();const url=await link.inputValue();assert.match(url,/\/g\/[a-f0-9]{48}$/);await C.getByAltText('QR code to this saved gizmo version').waitFor();
 const d=await browser.newContext({viewport:{width:390,height:844}}),Dp=await d.newPage();watch(Dp,'Dp');await Dp.goto(url);await Dp.getByRole('heading',{name:'Judge Alpha Mars Cat',exact:true}).waitFor();
 await Dp.getByRole('button',{name:'Remix this gizmo',exact:true}).click();await Dp.getByLabel('Remix display name',{exact:true}).fill('Judge Beta');await Dp.getByRole('button',{name:'Create my remix',exact:true}).click();await Dp.waitForURL('**/make?draft=*');
 await Dp.getByLabel('Creator gizmo name',{exact:true}).fill('Judge Beta Moon Cat');await Dp.getByLabel('Starting Gravity (m/s²)',{exact:true}).fill('1.62');await Dp.getByRole('status').filter({hasText:'peak 7.72 m'}).waitFor();
 await Dp.getByRole('button',{name:'Publish to showcase',exact:true}).click();await Dp.getByLabel('Gizmo snapshot link',{exact:true}).waitFor();await Dp.screenshot({path:`${OUT}/09-creator-remix.png`});
 await C.getByRole('button',{name:'Refresh live showcase',exact:true}).click();await C.locator('.creator-showcase').getByText('Judge Beta Moon Cat',{exact:true}).waitFor();
 for(const [template,field,value,expect] of [['circuit','Starting Voltage (V)','12','1.20 A current · 14.40 W power'],['light','Starting Green light (%)','100','RGB 255, 255, 0'],['solar','Starting Panel area (m²)','2','200.0 W power · 200.0 J collected']] as const){
  await Dp.getByLabel('Creator template',{exact:true}).selectOption(template);await Dp.getByRole('button',{name:'New experiment',exact:true}).click();await Dp.getByLabel(field,{exact:true}).fill(value);
  if(template==='circuit')await Dp.getByRole('button',{name:'Close switch',exact:true}).click();if(template==='solar')await Dp.getByRole('button',{name:'Collect for 1 second',exact:true}).click();
  await Dp.getByRole('status').filter({hasText:expect}).waitFor();}
 await noOverflow(Dp,'creator mobile');await c.close();await d.close();
});
await step('desktop layout keeps the immersive feed without horizontal scrolling',async()=>{
 const d=await browser.newContext({viewport:{width:1280,height:800}}),D=await d.newPage();watch(D,'D');await D.goto(BASE);await enterWelcome(D,/./);await D.keyboard.press('Escape');await D.locator('[data-post]').first().waitFor();
 await noOverflow(D,'desktop');await D.screenshot({path:`${OUT}/08-desktop.png`});await d.close();
});
await browser.close();
assert.deepEqual(errors,[],'no page errors');
console.log('Browser journey passed. Screenshots in test-results/.');

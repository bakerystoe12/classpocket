import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
const base=process.env.TEST_URL||'http://localhost:3003';
const b=await chromium.launch({channel:'msedge',headless:true});const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const p=await c.newPage();const errors:string[]=[];p.on('pageerror',e=>errors.push(e.message));mkdirSync('test-results',{recursive:true});
try{
 await p.goto(base+'/?gizmo=lesson-beam-1');await p.locator('#post-lesson-beam-1').waitFor();assert.equal(await p.locator('.science-player').count(),10);assert.equal(await p.locator('.gizmo-post').count(),10);
 const first=p.locator('#post-lesson-beam-1');await p.screenshot({path:'test-results/science-home-mobile.png'});
 assert.equal(await first.getByRole('button',{name:'Run experiment',exact:true}).isDisabled(),true);
 const slider=first.getByLabel('Distance from pivot',{exact:true});await slider.focus();await p.keyboard.press('ArrowRight');await p.keyboard.press('ArrowRight');assert.equal(await slider.inputValue(),'3');
 await first.getByRole('button',{name:'Balanced',exact:true}).click();await first.getByRole('button',{name:'Run experiment',exact:true}).click();await first.getByText('THE JOKE WAS THE SETUP. THIS IS THE SCIENCE.',{exact:true}).waitFor();
 await first.getByRole('button',{name:'Like Goose vs. the mega pickle',exact:true}).click();await p.waitForFunction(()=>document.querySelector('[aria-label="Like Goose vs. the mega pickle"]')?.getAttribute('aria-pressed')==='true');
 await first.getByRole('button',{name:'Save Goose vs. the mega pickle',exact:true}).click();await p.waitForFunction(()=>document.querySelector('[aria-label="Save Goose vs. the mega pickle"]')?.getAttribute('aria-pressed')==='true');
 const download=p.waitForEvent('download');await first.getByRole('button',{name:'Capture Goose vs. the mega pickle',exact:true}).click();assert.equal((await download).suggestedFilename(),'lesson-beam-1.png');
 await p.reload();await first.waitFor();await p.waitForFunction(()=>document.querySelector('[aria-label="Like Goose vs. the mega pickle"]')?.getAttribute('aria-pressed')==='true');
 await p.goto(base+'/?gizmo=lesson-beam-9');await p.waitForFunction(()=>{const e=document.getElementById('post-lesson-beam-9');return e&&e.getBoundingClientRect().top<150;});
 await p.goto(base+'/?gizmo=touch-grass');await p.waitForFunction(()=>{const e=document.getElementById('post-touch-grass');return e&&e.getBoundingClientRect().top<150;});assert.equal(await p.locator('.science-player').count(),0);
 await p.setViewportSize({width:1440,height:1000});await p.goto(base);await first.waitFor();await p.screenshot({path:'test-results/science-home-desktop.png'});
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);console.log('PASS: focused educational Home, keyboard experiment, causal feedback, persisted social actions, SVG capture, direct educational/playground links, desktop overflow and no browser errors.');
}catch(e){await p.screenshot({path:'test-results/science-feed-failure.png',fullPage:true});throw e;}finally{await b.close();}

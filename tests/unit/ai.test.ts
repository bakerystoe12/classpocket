import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toDefinition,outputJsonSchema,systemPrompt,userPrompt,editContext} from '../../lib/ai/gizmo-ai';
import {screenPrompt} from '../../lib/ai/screen';
import {describeChanges,semanticIssues} from '../../lib/gizmo-spec';
import {jumpHeight,springLaunchSpeed} from '../../lib/physics-demo';
import * as fx from '../fixtures/model-outputs';
// Mocked model outputs: these tests cover the application's conversion and validation, not a live provider.
test('a cat-planet answer becomes a playable jumper definition with app-owned provenance and no sources',()=>{
 const r=toDefinition(fx.catPlanet,{base:null,subject:'Physics',prompt:'Make a planet where a cat jumps ridiculously high'});
 assert.ok(r.ok);if(!r.ok)return;const d=r.definition;
 assert.equal(d.engine,'jumper');assert.equal(d.params.gravity,1.62);assert.equal(d.visual.character,'cat');assert.equal(d.provenance.kind,'ai');assert.equal(d.provenance.reviewed,false);assert.deepEqual(d.sources,[]);
 assert.deepEqual(semanticIssues(d),[]);assert.ok(jumpHeight(6,d.params.gravity)>=d.params.goalHeight,'goal reachable at max control');
});
test('a follow-up edit changes supported behaviour: Mars gravity, spring pad and orange cat',()=>{
 const base=toDefinition(fx.catPlanet,{base:null,subject:'Physics',prompt:'cat'});assert.ok(base.ok);if(!base.ok)return;
 const r=toDefinition(fx.marsSpringOrange,{base:base.definition,subject:'Physics',prompt:'Make it Mars, add a spring launch pad and make the cat orange'});assert.ok(r.ok);if(!r.ok)return;
 const d=r.definition;assert.equal(d.params.gravity,3.71);assert.ok(d.objects.some(o=>o.kind==='spring-pad'));assert.equal(d.visual.characterColour,'#f28c28');assert.equal(d.visual.planet,'Mars');
 assert.ok(springLaunchSpeed(d.params.jumpSpeed,{springConstant:d.params.springConstant,compression:d.params.compression,mass:d.params.mass})>d.params.jumpSpeed,'the pad changes launch speed');
 assert.deepEqual(r.unsupported,['Purring sound effects']);
 const changes=describeChanges(base.definition,d).join('\n');assert.match(changes,/Gravity: 1.62 → 3.71/);assert.match(changes,/spring-pad/);assert.match(changes,/Character colour/);
});
test('params from another engine, unreachable goals and refusals never become drafts',()=>{
 const wrong=toDefinition(fx.wrongEngineParam,{base:null,subject:'Physics',prompt:'x'});assert.equal(wrong.ok,false);if(!wrong.ok&&!wrong.refused)assert.match(wrong.issues.map(i=>i.message).join(' '),/voltage/);
 const far=toDefinition(fx.unreachable,{base:null,subject:'Physics',prompt:'x'});assert.equal(far.ok,false);if(!far.ok&&!far.refused)assert.match(far.issues.map(i=>i.message).join(' '),/cannot be reached/);
 const no=toDefinition(fx.refusal,{base:null,subject:'Physics',prompt:'x'});assert.equal(no.ok,false);if(!no.ok)assert.equal(no.refused,true);
 assert.equal(toDefinition({engine:'jumper'},{base:null,subject:'Physics',prompt:'x'}).ok,false,'incomplete objects fail');
});
test('the provider schema is strict-mode compatible: every object closes and requires all keys',()=>{
 const walk=(s:Record<string,unknown>)=>{if(s.type==='object'){assert.equal(s.additionalProperties,false);assert.deepEqual(new Set(s.required as string[]),new Set(Object.keys(s.properties as object)));for(const v of Object.values(s.properties as Record<string,Record<string,unknown>>))walk(v);}if(s.type==='array')walk(s.items as Record<string,unknown>);};walk(outputJsonSchema as Record<string,unknown>);
});
test('prompts carry only the idea and gizmo settings, never identity or timetable data',()=>{
 const base=toDefinition(fx.catPlanet,{base:null,subject:'Physics',prompt:'cat'});assert.ok(base.ok);if(!base.ok)return;
 const text=userPrompt('make it orange',base.definition);assert.ok(!/provenance|requestId|owner|creator|timetable|schedule/i.test(text));assert.ok(!('provenance' in editContext(base.definition)));
 assert.match(systemPrompt(),/untrusted data/);assert.match(systemPrompt(),/Mars 3.71/);
});
test('screening keeps personal details and unsafe requests away from the provider',()=>{
 assert.equal(screenPrompt('Make a planet where a cat jumps ridiculously high').ok,true);
 assert.equal(screenPrompt('An orbital shot that explodes into confetti').ok,true);
 for(const bad of ['my name is Alex Smith and I go to Hill High School','email me at kid@example.com','call 0412 345 678','make a bomb','something with gore'])assert.equal(screenPrompt(bad).ok,false,bad);
});

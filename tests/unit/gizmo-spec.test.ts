import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gizmos,templates,planetHopTemplate,templateFor} from '../../lib/gizmos';
import {engines,engineSpecs,gizmoDefinitionSchema,parseDefinition,semanticIssues,upgradeDefinition,describeChanges,defaults,DefinitionError,type GizmoDefinition} from '../../lib/gizmo-spec';
const def=(patch:Partial<GizmoDefinition>)=>({...planetHopTemplate,...patch}) as GizmoDefinition;
test('every engine has a template and every template validates against the discriminated schema',()=>{
 assert.equal(templates.length,engines.length);
 for(const t of templates){assert.ok(gizmoDefinitionSchema.parse(t));assert.deepEqual(semanticIssues(t),[]);for(const k of Object.keys(engineSpecs[t.engine].params))assert.equal(typeof t.params[k],'number');}
});
test('engine params are strict: unknown keys and out-of-range values are rejected, defaults fill gaps',()=>{
 assert.throws(()=>parseDefinition({...planetHopTemplate,params:{...planetHopTemplate.params,teleport:1}}));
 assert.throws(()=>parseDefinition({...planetHopTemplate,params:{...planetHopTemplate.params,gravity:500}}));
 assert.throws(()=>parseDefinition({...planetHopTemplate,objects:[{kind:'laser'}]}));
 const filled=parseDefinition({...gizmos[2],params:{}});assert.deepEqual(filled.params,defaults(gizmos[2].engine));
 assert.throws(()=>parseDefinition({...gizmos[0],engine:'eval'}));
});
test('semantic checks reject unreachable goals, impossible landings and wrong planetary gravity',()=>{
 const unreachable=def({challenge:{metric:'maxHeight',comparator:'atLeast',target:40,label:'x'},params:{...planetHopTemplate.params,goalHeight:40}});
 assert.match(semanticIssues(unreachable).map(i=>i.message).join(' '),/cannot be reached/);
 const reachableWithSpring=def({objects:[{kind:'spring-pad'},{kind:'goal-ledge'}],params:{...planetHopTemplate.params,gravity:3.71,goalHeight:4},visual:{...planetHopTemplate.visual,planet:'Mars'},controls:[{param:'jumpSpeed',min:1,max:5}],challenge:{metric:'maxHeight',comparator:'atLeast',target:4,label:'Reach 4 m'}});
 assert.deepEqual(semanticIssues(reachableWithSpring),[]);
 assert.ok(semanticIssues(def({visual:{...planetHopTemplate.visual,planet:'Mars'}})).some(i=>/Mars/.test(i.message)));
 const lander=templates.find(t=>t.engine==='lander')!;assert.ok(semanticIssues({...lander,params:{...lander.params,gravity:9.81,thrust:5}}).some(i=>/Thrust/.test(i.message)));
 assert.throws(()=>parseDefinition({...lander,params:{...lander.params,gravity:9.81,thrust:5}}),DefinitionError);
 assert.ok(semanticIssues(def({controls:[{param:'jumpSpeed',min:5,max:2}]})).length>0);
});
test('version 1 records upgrade to the versioned schema without losing presentation fields',()=>{
 const v1={id:'old',title:'Old lander',caption:'from sqlite',engine:'lander',creator:'maker_x',accent:'#70d6ff',speed:1.5,published:true,attribution:'Original',instructions:'Land it',subject:'Physics',prompt:'a lander'};
 const v2=upgradeDefinition(v1);assert.equal(v2.schemaVersion,2);assert.equal(v2.title,'Old lander');assert.equal(v2.visual.accent,'#70d6ff');assert.equal(v2.speed,1.5);assert.deepEqual(v2.params,defaults('lander'));assert.equal(v2.provenance.kind,'manual');
});
test('change descriptions come from the validated settings diff, not model text',()=>{
 const after=def({params:{...planetHopTemplate.params,gravity:3.71},visual:{...planetHopTemplate.visual,planet:'Mars',characterColour:'#f28c28'},objects:[{kind:'goal-ledge'},{kind:'spring-pad'}]});
 const lines=describeChanges(planetHopTemplate,after).join('\n');
 assert.match(lines,/Gravity: 9.81 → 3.71/);assert.match(lines,/Planet: Earth → Mars/);assert.match(lines,/spring-pad/);assert.match(lines,/Character colour/);
 assert.deepEqual(describeChanges(planetHopTemplate,planetHopTemplate),['No supported settings changed.']);
});
test('template routing for the offline path picks the matching interaction family',()=>{
 assert.equal(templateFor('Make a planet where a cat jumps ridiculously high'),'jumper');assert.equal(templateFor('An orbital motion toy'),'orbit');assert.equal(templateFor('A solar sculpture with a panel'),'ecosystem');assert.equal(templateFor('A Newton puck command track'),'word');assert.equal(templateFor('A half-life decay model'),'chance');assert.equal(templateFor('A free fall playback'),'timeline');
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {customProgramSchema,programIssues,programDocument,starterProgram} from '../../lib/custom-program';
import {customTemplate,planetHopTemplate} from '../../lib/gizmos';
import {parseDefinition,describeChanges} from '../../lib/gizmo-spec';
import {toCustomDefinition,customUserPrompt,customOutputSchema} from '../../lib/ai/custom-gizmo';
const output={refused:false,refusalReason:'',subject:'Maths',title:'Fraction goblin',caption:'The goblin demands equal slices.',objective:'Explore equal groups.',instructions:'Tap to add slices and compare equal groups.',assumptions:['Illustrative grouping model.'],accent:'#c4a5ff',html:starterProgram.html,css:starterProgram.css,javascript:starterProgram.javascript,changeSummary:'Built a counting toy.',unsupported:[]};
test('custom content has an explicit engine and cannot enter trusted template renderers',()=>{
 assert.equal(parseDefinition(customTemplate).engine,'custom');
 assert.throws(()=>parseDefinition({...customTemplate,program:undefined}));
 assert.throws(()=>parseDefinition({...planetHopTemplate,program:starterProgram}));
 assert.throws(()=>customProgramSchema.parse({...starterProgram,javascript:'x'.repeat(40001)}));
});
test('source checks reject embedded frames, navigation, event attributes, imports and network calls',()=>{
 for(const html of ['<script>alert(1)</script>','<iframe srcdoc="x"></iframe>','<img src="https://example.com/x">','<svg onload="x"></svg>','<a href="/">go</a>','<meta http-equiv="refresh">'])assert.ok(programIssues({...starterProgram,html}).length,html);
 for(const javascript of ['fetch("https://example.com")','parent.document.body.remove()','localStorage.setItem("x","y")','import("x")','while(true){}','for(;;){}'])assert.ok(programIssues({...starterProgram,javascript}).length,javascript);
 assert.equal(programIssues(starterProgram).length,0);
});
test('sandbox document closes resource access and prevents script-string breakouts',()=>{
 const doc=programDocument({...starterProgram,javascript:'const x="</script><script>BAD()</script>";'},'channel','<img>title','nonce');
 assert.ok(doc.includes("connect-src 'none'"));assert.ok(doc.includes("worker-src 'none'"));assert.ok(doc.includes("form-action 'none'"));
 assert.ok(!doc.includes('</script><script>BAD'));assert.ok(!doc.includes('<title><img>'));
 assert.ok(doc.includes('event')===false||doc.includes('postMessage'));assert.ok(doc.includes('channel'));
});
test('custom generation handles any school subject and retains explicit class focus',()=>{
 const general=toCustomDefinition(output,{base:null,subject:null,prompt:'Fractions goblin'});assert.ok(general.ok);if(!general.ok)return;
 assert.equal(general.definition.subject,'Maths');assert.equal(general.definition.engine,'custom');assert.equal(general.definition.provenance.reviewed,false);
 const focused=toCustomDefinition(output,{base:general.definition,subject:'Physics',prompt:'Adapt it to energy fractions'});assert.ok(focused.ok);if(focused.ok)assert.equal(focused.definition.subject,'Physics');
 const changed={...general.definition,program:{...starterProgram,javascript:starterProgram.javascript+';console.log("changed")'}};
 assert.match(describeChanges(general.definition,changed).join(' '),/interactive program/);
});
test('refusals never become programs; provider context excludes identity and provenance',()=>{
 const no=toCustomDefinition({...output,refused:true,refusalReason:'Try another topic.',html:'',css:'',javascript:''},{base:null,subject:null,prompt:'x'});assert.equal(no.ok,false);
 const context=customUserPrompt('Change the colours',customTemplate,null);assert.ok(!/creator|owner|provenance|requestId|timetable|handle/.test(context));
 assert.equal(customOutputSchema.additionalProperties,false);
 assert.deepEqual(new Set(customOutputSchema.required),new Set(Object.keys(customOutputSchema.properties)));
});

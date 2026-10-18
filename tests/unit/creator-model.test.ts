import {test} from 'node:test';
import assert from 'node:assert/strict';
import {proposalFor,validateProposal,creatorTemplates} from '../../lib/creator-model';
import {definitionFromProposal,proposalFromDefinition} from '../../lib/creator-definitions';
import {semanticIssues,gizmoDefinitionSchema} from '../../lib/gizmo-spec';
test('all five creator templates have valid bounded real parameters',()=>{for(const template of creatorTemplates)assert.equal(validateProposal(proposalFor(template)).world.template,template);});
test('jump targets must be reachable for the actual gravity and launch speed',()=>{const p=proposalFor('jump');p.world.gravity=9.81;assert.throws(()=>validateProposal(p),/unreachable/);p.world.goalHeight=1;assert.equal(validateProposal(p).world.goalHeight,1);p.world.gravity=1.62;assert.ok(p.world.launchSpeed**2/(2*p.world.gravity)>7);});
test('reject unsafe parameters, injected code fields and malformed colours',()=>{const p=proposalFor('jump');assert.throws(()=>validateProposal({...p,world:{...p.world,gravity:0}}));assert.throws(()=>validateProposal({...p,world:{...p.world,red:101}}));assert.throws(()=>validateProposal({...p,world:{...p.world,html:'<script/>'}}));assert.throws(()=>validateProposal({...p,accent:'url(javascript:alert(1))'}));});
test('creator worlds persist as v2 definitions with typed settings and mirrored engine params',()=>{
 const circuit=definitionFromProposal(proposalFor('circuit'));assert.equal(circuit.engine,'circuit');assert.equal(circuit.world?.voltage,6);assert.equal(circuit.world?.resistance,10);assert.equal(circuit.params.voltage,6);
 const jump=definitionFromProposal(proposalFor('jump'));assert.equal(jump.engine,'jumper');assert.equal(jump.params.gravity,3.71);assert.equal(jump.params.jumpSpeed,5);
 assert.deepEqual(proposalFromDefinition(jump),proposalFor('jump'));
 assert.ok(gizmoDefinitionSchema.parse(jump));const tooHigh={...jump,world:{...jump.world!,goalHeight:50}};assert.ok(semanticIssues(tooHigh).some(i=>/unreachable/.test(i.message)));
 assert.throws(()=>definitionFromProposal({...proposalFor('solar'),world:{...proposalFor('solar').world,area:9}}));
});

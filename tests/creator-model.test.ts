import {test} from 'node:test';
import assert from 'node:assert/strict';
import {proposalFor,validateProposal,creatorTemplates} from '../lib/creator-model';
import {gizmoSchema} from '../lib/gizmos';
test('all five creator templates have valid bounded real parameters',()=>{for(const template of creatorTemplates)assert.equal(validateProposal(proposalFor(template)).world.template,template);});
test('jump targets must be reachable for the actual gravity and launch speed',()=>{const p=proposalFor('jump');p.world.gravity=9.81;assert.throws(()=>validateProposal(p),/unreachable/);p.world.goalHeight=1;assert.equal(validateProposal(p).world.goalHeight,1);p.world.gravity=1.62;assert.ok(p.world.launchSpeed**2/(2*p.world.gravity)>7);});
test('reject unsafe parameters, injected code fields and malformed colours',()=>{const p=proposalFor('jump');assert.throws(()=>validateProposal({...p,world:{...p.world,gravity:0}}));assert.throws(()=>validateProposal({...p,world:{...p.world,red:101}}));assert.throws(()=>validateProposal({...p,world:{...p.world,html:'<script/>'}}));assert.throws(()=>validateProposal({...p,accent:'url(javascript:alert(1))'}));});
test('extended gizmo schema retains typed world settings when persisted',()=>{const p=proposalFor('circuit');const g=gizmoSchema.parse({...p,id:'test-world',engine:'circuit',creator:'maker',published:false,attribution:'Original',speed:1,subject:'Physics'});assert.equal(g.world?.voltage,6);assert.equal(g.world?.resistance,10);});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fallingObject,lightColour,solarPower,puckStep,puckPosition,ohmsLaw,splitterExits,powerPerExit,netCharge,jumpHeight,springLaunchSpeed,workDone,potentialEnergy,decayStep,planetGravity,physicsBriefs} from '../../lib/physics-demo';
import {gizmos} from '../../lib/gizmos';
const close=(a:number,b:number,eps=1e-9)=>assert.ok(Math.abs(a-b)<=eps,`${a} ≉ ${b}`);
// Deterministic PRNG so statistical checks are repeatable.
function mulberry(seed:number){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
test('all twenty authored posts are Physics with a distinct concept and an honest model boundary',()=>{
 assert.equal(gizmos.length,20);assert.equal(new Set(gizmos.map(g=>g.engine)).size,20);
 assert.equal(new Set(gizmos.map(g=>physicsBriefs[g.engine].concept)).size,20);
 for(const g of gizmos){assert.equal(g.subject,'Physics');assert.ok(g.objective);assert.ok(g.assumptions.length>=1);assert.ok(physicsBriefs[g.engine].tryIt);}
});
test('free fall conserves mechanical energy for any mass, height and gravity',()=>{
 for(const cfg of [{mass:1,height:10,gravity:9.81},{mass:4,height:25,gravity:3.71},{mass:.5,height:2,gravity:24.79}])for(const t of [0,10,25,50,75,100]){const f=fallingObject(t,cfg);close(f.potential+f.kinetic,cfg.mass*cfg.gravity*cfg.height,1e-9);assert.ok(f.height>=0);}
 close(fallingObject(50).height,7.5);assert.ok(fallingObject(100).height<1e-9);
});
test('work, potential energy and solar power use the stated formulas and units',()=>{
 assert.equal(workDone(20,3),60);close(potentialEnergy(1,9.81,4),39.24);
 assert.equal(solarPower(500,.5),50);assert.equal(solarPower(1000,.5),100);assert.equal(solarPower(500,1,.25),125);
});
test('Ohm’s law, beam splitters conserve power, and charge counts',()=>{
 assert.equal(ohmsLaw(6,3),2);assert.equal(ohmsLaw(12,3),4);assert.equal(ohmsLaw(6,6),1);assert.throws(()=>ohmsLaw(5,0));
 for(let depth=1;depth<=8;depth++){close(splitterExits(depth)*powerPerExit(100,depth),100);}assert.equal(splitterExits(5),16);assert.equal(powerPerExit(100,5),6.25);
 assert.equal(netCharge(3,3),0);assert.equal(netCharge(3,4),-1);assert.equal(netCharge(3,1),2);
});
test('RGB light adds and a zero-force coast preserves velocity while force changes it by F/m',()=>{
 assert.deepEqual(lightColour(100,100,0),[255,255,0]);assert.deepEqual(lightColour(100,100,100),[255,255,255]);
 assert.equal(puckStep(2,0),2);assert.equal(puckStep(2,-2),0);assert.equal(puckStep(0,4,2),2);assert.equal(puckPosition(0,0,2,1),1);assert.equal(puckPosition(1,2,0,1),3);
});
test('jump height = v²/2g, weaker gravity jumps higher, and a spring adds ½kx²',()=>{
 close(jumpHeight(4,9.81),16/19.62);close(jumpHeight(4,planetGravity.Mars),16/(2*3.71));assert.ok(jumpHeight(4,planetGravity.Mars)>jumpHeight(4,planetGravity.Earth));
 const v=springLaunchSpeed(4,{springConstant:800,compression:.2,mass:4});close(.5*4*v*v,.5*4*16+.5*800*.04);
});
test('half-life simulation decays independently: average halves, single runs fluctuate',()=>{
 const rand=mulberry(42);let total=0,exactHalf=0;const runs=400;
 for(let i=0;i<runs;i++){const n=decayStep(128,.5,rand);total+=n;if(n===64)exactHalf++;}
 const mean=total/runs;assert.ok(Math.abs(mean-64)<1.5,`mean ${mean}`);// σ of the mean ≈ 5.66/√400 ≈ 0.28
 assert.ok(exactHalf<runs*.2,'individual runs are usually not exactly half');
 let remaining=1024;for(let k=0;k<3;k++)remaining=decayStep(remaining,.5,rand);assert.ok(Math.abs(remaining-128)<45,`after three half-lives ${remaining}`);
});

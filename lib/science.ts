import {z} from 'zod';
import type {Challenge,Study} from './study';

export const learningSchema=z.object({hook:z.string().min(1).max(220),concept:z.string().min(1).max(100),cue:z.string().min(1).max(180),stage:z.enum(['discover','remix','recall','transfer'])});
export const gameSchema=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('torque'),leftForce:z.number().int().min(1).max(6),leftDistance:z.number().int().min(1).max(4),force:z.number().int().min(1).max(6),distance:z.number().int().min(1).max(4),lock:z.enum(['force','distance','none']),goal:z.enum(['balance','right','left'])}),
 z.object({kind:z.literal('atom'),element:z.enum(['Hydrogen','Helium','Lithium','Carbon','Oxygen','Neon','Sodium','Magnesium','Chlorine']),protons:z.number().int().min(1).max(17),neutrons:z.number().int().min(0).max(20),electrons:z.number().int().min(0).max(20),charge:z.number().int().min(-2).max(2)})
]);
export type ScienceGame=z.infer<typeof gameSchema>;
export const beamPredictions=['Left down','Balanced','Right down'];
export const atomPredictions=['Positive','Neutral','Negative'];
const elements={Hydrogen:1,Helium:2,Lithium:3,Carbon:6,Oxygen:8,Neon:10,Sodium:11,Magnesium:12,Chlorine:17};
export function beamOutcome(left:number,right:number){return left===right?'Balanced':right>left?'Right down':'Left down';}
export function chargeOutcome(charge:number){return charge===0?'Neutral':charge>0?'Positive':'Negative';}
export function validateExperiment(c:Challenge){
 const g=c.game;if(!g)return;
 if(!c.learning)throw new Error('Experiments need a hook, concept, memory cue and learning stage.');
 if(g.kind==='atom'&&elements[g.element]!==g.protons)throw new Error('An element must match its proton number.');
 const choices=g.kind==='torque'?beamPredictions:atomPredictions;
 if(!choices.every(x=>c.choices.includes(x)))throw new Error('Experiment predictions do not match this engine.');
 if(g.kind==='torque'){
  const possible=Array.from({length:6},(_,i)=>i+1).some(f=>Array.from({length:4},(_,i)=>i+1).some(d=>(g.lock!=='force'||f===g.force)&&(g.lock!=='distance'||d===g.distance)&&beamOutcome(g.leftForce*g.leftDistance,f*d)===(g.goal==='balance'?'Balanced':g.goal==='right'?'Right down':'Left down')));
  if(!possible)throw new Error('This beam goal cannot be reached with the permitted controls.');
  if(c.target!==(g.goal==='balance'?'Balanced':g.goal==='right'?'Right down':'Left down'))throw new Error('Beam target must match its goal.');
 }else {if(g.protons-g.charge<0||g.protons-g.charge>20)throw new Error('This charge goal needs an electron count outside the permitted model.');if(c.target!==chargeOutcome(g.charge))throw new Error('Atom target must match its charge goal.');}
}
// Store a bounded, validated experiment configuration in the existing attempt field.
// A client-provided correctness flag or a correct prediction alone cannot complete a mission.
export function gradeExperiment(c:Challenge,answer:string){
 const g=c.game!;let input:unknown;try{input=JSON.parse(answer);}catch{throw new Error('Submit an experiment configuration and prediction.');}
 if(g.kind==='torque'){
  const a=z.object({f:z.number().int().min(1).max(6),d:z.number().int().min(1).max(4),p:z.enum(['Left down','Balanced','Right down'])}).strict().parse(input);
  if(g.lock==='force'&&a.f!==g.force||g.lock==='distance'&&a.d!==g.distance)throw new Error('This mission fixes that control.');
  const left=g.leftForce*g.leftDistance,right=a.f*a.d,outcome=beamOutcome(left,right),correct=outcome===c.target&&a.p===outcome;
  return {correct,outcome,left,right,feedback:`Left: ${g.leftForce} N × ${g.leftDistance} m = ${left} Nm. Right: ${a.f} N × ${a.d} m = ${right} Nm. ${outcome}. ${a.p!==outcome?'Your prediction differed: compare both turning effects. ':outcome!==c.target?'Your prediction matched; now change the setup to meet the goal. ':''}${c.explanation}`};
 }
 const a=z.object({e:z.number().int().min(0).max(20),p:z.enum(['Positive','Neutral','Negative'])}).strict().parse(input);
 const charge=g.protons-a.e,outcome=chargeOutcome(charge),correct=charge===g.charge&&a.p===outcome;
 return {correct,outcome,charge,feedback:`${g.protons} protons − ${a.e} electrons = ${charge>0?'+':''}${charge}. ${g.neutrons} neutrons add no charge. ${a.p!==outcome?'Your charge prediction differed. ':charge!==g.charge?'Your prediction matched; change the electron count to reach the requested charge. ':''}${c.explanation}`};
}

const beamSource='Moment = force × perpendicular distance from the pivot to the line of action. A downward force on the left turns the beam anticlockwise; on the right it turns clockwise. Equal opposing moments balance. Increasing force or perpendicular distance increases moment. In this ideal model the pivot is fixed and frictionless and the beam’s own weight is ignored.';
const atomSource='Protons have charge +1, electrons −1 and neutrons 0 in units of elementary charge. Atomic number is the number of protons and determines the element. An atom is neutral when its proton and electron counts are equal. Gaining electrons makes an atom more negative; losing electrons makes it more positive. Changing the number of neutrons changes the isotope, not the element or net charge. Net charge = proton count − electron count. Electron dots here are a counting model, not physical paths or a scale drawing.';
const beamRows:[string,string,string,string,number,number,number,number,'force'|'distance'|'none','balance'|'right'|'left',z.infer<typeof learningSchema>['stage']][]=[
 ['Goose vs. the mega pickle','A goose brought a 6 N pickle to a seesaw. Its entire personality depends on staying level.','Balance the pickle: left 6 N at 1 m. You have 2 N on the right. Move your force away from the pivot.','Same push, longer reach: more turning effect.',6,1,2,1,'force','balance','discover'],
 ['Gym rat, tiny lever','The goose bought a gym membership instead of a longer lever. Can that work too?','Balance 4 N at 2 m on the left. Your right-hand distance is fixed at 2 m. Change the force.','Double force doubles moment when distance stays fixed.',4,2,1,2,'distance','balance','remix'],
 ['Pizza on a power trip','A pizza wants the right side to bow down. You are its extremely underpaid engineer.','Make the right side tip down against 3 N at 2 m on the left. Use 2 N; change the distance.','Compare moments, not force sizes alone.',3,2,2,1,'force','right','remix'],
 ['The duck has left the chat','The left duck demands the low seat. The right duck has main-character syndrome.','Make the LEFT side tip down: left 4 N at 2 m. Right force stays 3 N. Choose its distance.','The larger moment determines the turning direction.',4,2,3,4,'force','left','remix'],
 ['The pickle returns','No gym this time. Remember how a small force bullied a big pickle?','Balance 6 N at 1 m on the left using 3 N on the right. Find the distance.','Recall: moment = force × perpendicular distance.',6,1,3,1,'force','balance','recall'],
 ['Tiny spoon, huge ego','The goose swapped its long lever for a tiny spoon. Suddenly strength matters.','Balance 2 N at 3 m. Your right-hand distance is just 1 m. Change the force.','Shorter reach needs more force for the same moment.',2,3,1,1,'distance','balance','remix'],
 ['Two ducks, same drama','One duck screams “more force!” The other screams “longer lever!” Both can be right.','Balance 4 N at 3 m on the left. Choose BOTH force and distance on the right.','Different force-distance pairs can give the same moment.',4,3,1,1,'none','balance','recall'],
 ['Goose opens a space hatch','Same rule. New problem. A cartoon space hatch is stuck. The duck is filming.','Model the hatch as a beam. Beat 5 N at 2 m on the left so the right side goes down. Your push is 3 N.','Transfer: a longer lever can overcome a bigger resisting force.',5,2,3,1,'force','right','transfer'],
 ['The counterfeit bodybuilder','The gym rat claims the bigger force ALWAYS wins. Make the receipts disagree.','Left: 6 N at 1 m. Right: only 2 N. Make the weaker right force win by choosing its distance.','A smaller force can win with a larger perpendicular distance.',6,1,2,1,'force','right','transfer'],
 ['Final boss: no goose hints','The goose is off-duty. A rescue robot needs your actual physics.','Balance a rescue beam: 5 N at 2 m on the left. You have 2 N or more available on the right. Choose force and distance.','Equal opposing moments balance, even in a new situation.',5,2,2,1,'none','balance','transfer']
];
const atomRows:[string,string,string,string,ScienceGame & {kind:'atom'},z.infer<typeof learningSchema>['stage']][]=[
 ['Electron goblin strikes','A lithium atom hired a goblin accountant. It has one electron too few. Fix the books.','Make this lithium atom neutral. Add or remove electrons; protons stay fixed.','Neutral means equal positive and negative charges.',{kind:'atom',element:'Lithium',protons:3,neutrons:4,electrons:2,charge:0},'discover'],
 ['Goblin takes a snack tax','The goblin steals ONE electron from neutral lithium. It claims lithium became negative. Sus.','Build a lithium ion with charge +1. Predict its sign before running the model.','Losing a negative electron makes the atom more positive.',{kind:'atom',element:'Lithium',protons:3,neutrons:4,electrons:3,charge:1},'remix'],
 ['Chlorine adopts a gremlin','Chlorine found a spare electron and called it emotional support.','Build a chlorine ion with charge −1 by changing its electron count.','Gaining a negative electron makes the atom more negative.',{kind:'atom',element:'Chlorine',protons:17,neutrons:18,electrons:17,charge:-1},'remix'],
 ['Neutron glow-up','Lithium changed its neutron outfit. The goblin insists it is a new element. Absolutely not.','This lithium has 3 neutrons instead of 4. Make it neutral without changing its 3 protons.','Neutrons change isotope; protons determine the element.',{kind:'atom',element:'Lithium',protons:3,neutrons:3,electrons:4,charge:0},'remix'],
 ['Return of the snack tax','New atom, same theft. Sodium lost an electron while scrolling.','Build sodium with charge +1. Recall which particle controls the change.','Charge = protons − electrons. The element stays sodium.',{kind:'atom',element:'Sodium',protons:11,neutrons:12,electrons:11,charge:1},'recall'],
 ['Oxygen wants two followers','Oxygen is collecting electrons like followers. Two more, please.','Build an oxygen ion with charge −2. Count the extra electrons.','Two extra electrons give charge −2, not +2.',{kind:'atom',element:'Oxygen',protons:8,neutrons:8,electrons:8,charge:-2},'remix'],
 ['Magnesium unsubscribes','Magnesium cancelled TWO electron subscriptions. Did it go negative?','Build a magnesium ion with charge +2. Choose the electron count and predict the sign.','Losing two electrons leaves two excess positive charges.',{kind:'atom',element:'Magnesium',protons:12,neutrons:12,electrons:12,charge:2},'recall'],
 ['Helium fires its accountant','Two protons. One electron. A balloon-sized accounting problem.','Make helium neutral. This is a particle-counting model, not a balloon experiment.','Neutrality comes from equal counts, not from neutron count.',{kind:'atom',element:'Helium',protons:2,neutrons:2,electrons:1,charge:0},'transfer'],
 ['Isotope identity crisis','Carbon put on two extra neutrons and demanded a new username. The proton count says no.','This carbon isotope has 8 neutrons and 6 protons. Restore a neutral atom.','Carbon stays carbon because it still has 6 protons.',{kind:'atom',element:'Carbon',protons:6,neutrons:8,electrons:7,charge:0},'transfer'],
 ['Final audit: no goblin hints','An unknown charge balance lands on your desk. The goblin is on annual leave.','Sodium must end at charge +1. Start with 13 electrons; use the rule, not the joke.','Find electrons from the target charge and fixed proton count.',{kind:'atom',element:'Sodium',protons:11,neutrons:12,electrons:13,charge:1},'transfer']
];
export function scienceSamples():{physics:Study;chemistry:Study}{
 const physics:Study={title:'Moments & turning forces',topic:'Moments & turning forces',category:'Physics',origin:'included',sourceName:'Original reviewed demo notes · ideal beam model',pages:[{page:1,text:beamSource}],challenges:beamRows.map(([title,hook,clue,cue,leftForce,leftDistance,force,distance,lock,goal,stage],i)=>({id:`beam-${i+1}`,title,clue,target:goal==='balance'?'Balanced':goal==='right'?'Right down':'Left down',choices:[...beamPredictions],explanation:cue,page:1,quote:beamSource,learning:{hook,concept:'Moments = force × perpendicular distance',cue,stage},game:{kind:'torque',leftForce,leftDistance,force,distance,lock,goal}}))};
 const chemistry:Study={title:'Atoms & charge',topic:'Atoms & charge',category:'Chemistry',origin:'included',sourceName:'Original reviewed demo notes · atomic charge counting model',pages:[{page:1,text:atomSource}],challenges:atomRows.map(([title,hook,clue,cue,game,stage],i)=>({id:`atom-${i+1}`,title,clue,target:chargeOutcome(game.charge),choices:[...atomPredictions],explanation:cue,page:1,quote:atomSource,learning:{hook,concept:'Charge = protons − electrons',cue,stage},game}))};
 return {physics,chemistry};
}

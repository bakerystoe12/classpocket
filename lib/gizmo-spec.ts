import {z} from 'zod';
import {jumpHeight,springLaunchSpeed,ohmsLaw,powerPerExit,planetGravity} from './physics-demo';
// Versioned gizmo definitions. A definition only selects and configures application-owned renderers:
// it can never carry code, markup or SVG. Owner IDs, publication state and database IDs are server-controlled
// and live outside the definition.
export const GIZMO_SCHEMA_VERSION=2;
export const engines=['particles','lander','mower','factory','gravity','waves','orbit','racer','paint','springs','atom','mixer','ecosystem','fractal','circuit','beat','timeline','word','chance','solar','jumper'] as const;
export type Engine=typeof engines[number];
export const subjects=['Physics','Chemistry','Biology','Maths','Art','Music','History','English','Computing','General'] as const;
export type Subject=typeof subjects[number];
export const characters=['none','cat','robot','astronaut','goblin','frog'] as const;
export const planets=['none','Earth','Moon','Mars','Jupiter','Venus','Mercury','Saturn','Titan','Pluto','custom'] as const;
export type ParamSpec={label:string;unit:string;min:number;max:number;step:number;default:number;help:string};
export type MetricSpec={label:string;unit:string};
type EngineSpec={name:string;params:Record<string,ParamSpec>;objects:readonly string[];metrics:Record<string,MetricSpec>;uses:string};
const p=(label:string,unit:string,min:number,max:number,step:number,value:number,help:string):ParamSpec=>({label,unit,min,max,step,default:value,help});
const g=(value:number)=>p('Gravity','m/s²',.5,30,.01,value,'Constant gravitational field strength');
export const engineSpecs:Record<Engine,EngineSpec>={
 particles:{name:'Particle field',uses:'drag an attraction or repulsion field through glowing particles',params:{attraction:p('Field strength','relative',-2,2,.1,1,'Negative values repel'),damping:p('Damping','per frame',.9,.995,.001,.976,'Velocity kept each frame'),count:p('Particles','count',100,1200,50,800,'Number of particles')},objects:[],metrics:{}},
 lander:{name:'Lander',uses:'thrust and rotate a spacecraft to land gently on a pad',params:{gravity:g(1.62),thrust:p('Thrust acceleration','m/s²',1,40,.1,4.2,'Engine acceleration when firing'),fuel:p('Fuel','s of thrust',2,30,.5,8,'Total firing time available'),safeSpeed:p('Safe landing speed','m/s',.5,6,.1,2,'Maximum touchdown speed for a gentle landing'),padWidth:p('Pad width','m',8,40,1,23,'Landing pad width')},objects:[],metrics:{softLandings:{label:'Gentle landings',unit:'count'}}},
 mower:{name:'Work mower',uses:'drag a mower against a constant resistance and measure work',params:{force:p('Push force','N',1,200,1,20,'Constant force along the path')},objects:[],metrics:{work:{label:'Work done',unit:'J'},distance:{label:'Path length',unit:'m'}}},
 factory:{name:'Gravity factory',uses:'drop tokens and total their gravitational potential energy',params:{mass:p('Token mass','kg',.1,20,.1,1,'Mass of each token'),height:p('Drop height','m',.5,30,.5,4,'Height each token falls'),gravity:g(9.81)},objects:[],metrics:{energy:{label:'Potential energy released',unit:'J'},drops:{label:'Tokens collected',unit:'count'}}},
 gravity:{name:'Gravity garden',uses:'launch bodies around a movable central mass',params:{strength:p('Central attraction','relative',40,600,10,160,'GM of the central mass in screen units'),bodies:p('Starting bodies','count',0,40,1,15,'Bodies orbiting at the start')},objects:[],metrics:{}},
 waves:{name:'Wave playground',uses:'vary frequency, amplitude and phase of two waves and see their sum',params:{frequency:p('Frequency','cycles per screen',1,12,.5,4,'Wave A frequency'),ratio:p('Frequency ratio','B ÷ A',.5,3,.25,1,'Wave B frequency relative to A'),amplitude:p('Amplitude','px',10,100,1,55,'Peak displacement on screen'),phase:p('Phase offset','°',0,360,15,0,'Wave B phase relative to A')},objects:[],metrics:{}},
 orbit:{name:'Orbital shot',uses:'slingshot a probe past a planet into a target ring',params:{strength:p('Planet attraction','relative',50,600,10,200,'GM of the planet in screen units'),targetX:p('Target x','px',260,440,5,402,'Horizontal ring position'),targetY:p('Target y','px',60,300,5,138,'Vertical ring position'),maxLaunch:p('Maximum launch speed','px/frame',4,14,.5,10,'Launch speed cap')},objects:[],metrics:{hits:{label:'Target hits',unit:'count'}}},
 racer:{name:'Inertia racer',uses:'steer a car whose sideways momentum takes time to change',params:{response:p('Steering force','relative',.004,.04,.001,.012,'Acceleration toward the steering target'),damping:p('Sideways damping','per frame',.8,.98,.01,.92,'Velocity kept each frame'),traffic:p('Traffic speed','px/frame',1.5,6,.1,3.3,'Speed of oncoming traffic')},objects:[],metrics:{score:{label:'Score',unit:'points'}}},
 paint:{name:'Light painting',uses:'paint with additive coloured light trails',params:{brush:p('Brush size','px',1,12,.5,6,'Trail width'),trail:p('Trail life','per frame',.98,.999,.001,.994,'Trail fade rate'),palette:p('Starting palette','index',0,5,1,0,'Colour palette')},objects:[],metrics:{}},
 springs:{name:'Spring mesh',uses:'stretch and release a damped spring network',params:{stiffness:p('Spring stiffness','relative',.005,.08,.001,.03,'Restoring force per unit stretch'),damping:p('Damping','per frame',.8,.99,.01,.92,'Velocity kept each frame'),anchor:p('Anchor pull','relative',0,.04,.001,.015,'Pull back to the rest grid')},objects:[],metrics:{}},
 atom:{name:'Charge counter',uses:'add and remove electrons from an atom with fixed protons',params:{protons:p('Protons','count',1,12,1,3,'Fixed nuclear charge'),neutrons:p('Neutrons','count',0,14,1,4,'Neutrons in the nucleus'),electrons:p('Starting electrons','count',0,14,1,3,'Electrons at the start')},objects:[],metrics:{charge:{label:'Net charge',unit:'e'}}},
 mixer:{name:'RGB light kitchen',uses:'mix red, green and blue light additively',params:{red:p('Red','%',0,100,1,50,'Starting red intensity'),green:p('Green','%',0,100,1,50,'Starting green intensity'),blue:p('Blue','%',0,100,1,0,'Starting blue intensity')},objects:[],metrics:{}},
 ecosystem:{name:'Solar sculpture',uses:'convert irradiance and panel area into electrical power and energy',params:{irradiance:p('Irradiance','W/m²',0,1200,10,500,'Starting sunlight intensity'),area:p('Panel area','m²',.05,2,.05,.5,'Starting panel area'),efficiency:p('Efficiency','%',5,40,1,20,'Fraction of incident power converted')},objects:[],metrics:{energy:{label:'Energy collected',unit:'J'},power:{label:'Electrical power',unit:'W'}}},
 fractal:{name:'Beam splitter tree',uses:'branch an input beam through ideal 50:50 splitters',params:{input:p('Input power','mW',10,1000,10,100,'Optical power entering the tree'),depth:p('Splitter depth','levels',1,8,1,5,'Levels of branching'),angle:p('Branch angle','°',10,65,1,50,'Drawing angle')},objects:[],metrics:{powerPerExit:{label:'Power per exit',unit:'mW'}}},
 circuit:{name:'Ideal circuit',uses:'switch an ideal resistor circuit and compute current',params:{voltage:p('Voltage','V',1,24,1,5,'Starting supply voltage'),resistance:p('Resistance','Ω',1,100,1,5,'Starting resistance')},objects:['switch','bulb'],metrics:{current:{label:'Current',unit:'A'}}},
 beat:{name:'Frequency DJ',uses:'program a step sequencer with separate pitch and rhythm controls',params:{pitch:p('Base pitch','Hz',110,880,1,220,'Oscillator frequency of track 1'),step:p('Step time','ms',100,500,10,220,'Time between steps')},objects:[],metrics:{}},
 timeline:{name:'Free-fall scrubber',uses:'scrub an ideal fall and compare potential and kinetic energy',params:{mass:p('Mass','kg',.1,100,.1,1,'Mass of the falling object'),height:p('Drop height','m',1,100,1,10,'Starting height'),gravity:g(9.81)},objects:[],metrics:{}},
 word:{name:'Newton command remix',uses:'sequence push and coast commands for a frictionless puck',params:{mass:p('Puck mass','kg',.5,10,.5,1,'Mass of the puck'),force:p('Push force','N',.5,10,.5,2,'Force during a push command')},objects:[],metrics:{velocity:{label:'Final velocity',unit:'m/s'}}},
 chance:{name:'Half-life lab',uses:'simulate independent random decays across many nuclei',params:{nuclei:p('Starting nuclei','count',16,512,16,128,'Undecayed nuclei at the start')},objects:[],metrics:{}},
 solar:{name:'Solar system explorer',uses:'scrub time and compare planetary orbital periods',params:{maxDays:p('Time range','Earth days',365,3650,5,730,'Maximum time on the scrubber'),planet:p('Selected planet','index',0,3,1,2,'0 Mercury · 1 Venus · 2 Earth · 3 Mars')},objects:[],metrics:{}},
 jumper:{name:'Planet hop',uses:'launch a character straight up under a chosen gravity toward a goal height',params:{gravity:g(9.81),jumpSpeed:p('Jump speed','m/s',.5,20,.1,4,'Launch speed from the character’s legs'),mass:p('Character mass','kg',.5,100,.5,4,'Mass of the character'),springConstant:p('Spring constant','N/m',0,5000,10,800,'Stiffness of the launch pad spring'),compression:p('Spring compression','m',0,.6,.01,.2,'How far the pad spring is compressed'),goalHeight:p('Goal height','m',.2,200,.1,1.5,'Height of the goal ledge')},objects:['spring-pad','goal-ledge','moon-rocks'],metrics:{maxHeight:{label:'Highest jump',unit:'m'},goals:{label:'Goal reached',unit:'count'}}}
};
const hex=z.string().regex(/^#[0-9a-fA-F]{6}$/);
const text=(max:number)=>z.string().trim().max(max);
export const provenanceSchema=z.object({kind:z.enum(['authored','template','manual','ai','remix']),provider:z.string().max(40).optional(),model:z.string().max(80).optional(),requestId:z.string().max(60).optional(),generatedAt:z.string().max(40).optional(),reviewed:z.boolean().default(false),remixOf:z.string().max(100).optional(),repaired:z.boolean().optional()});
const common={schemaVersion:z.literal(GIZMO_SCHEMA_VERSION),subject:z.enum(subjects),title:text(70).min(1),caption:text(240).min(1),objective:text(200).default(''),instructions:text(300).default(''),assumptions:z.array(text(240).min(1)).max(4).default([]),visual:z.object({accent:hex,character:z.enum(characters).default('none'),characterColour:hex.default('#f5a35c'),planet:z.enum(planets).default('none')}),feedback:z.object({success:text(140).default(''),retry:text(140).default('')}).default({success:'',retry:''}),difficulty:z.enum(['gentle','standard','tricky']).default('standard'),speed:z.number().min(.25).max(3).default(1),prompt:text(300).default(''),attribution:text(200).default(''),sources:z.array(z.object({title:text(120).min(1),page:z.number().int().positive().optional(),url:z.string().url().startsWith('https://').max(300).optional()})).max(3).default([]),provenance:provenanceSchema};
function paramsSchema(e:Engine){return z.object(Object.fromEntries(Object.entries(engineSpecs[e].params).map(([k,s])=>[k,z.number().finite().min(s.min).max(s.max).default(s.default)]))).strict();}
function variant(e:Engine){const spec=engineSpecs[e],keys=Object.keys(spec.params) as [string,...string[]],metrics=Object.keys(spec.metrics);
 return z.object({...common,engine:z.literal(e),params:paramsSchema(e).prefault({}),
  objects:spec.objects.length?z.array(z.object({kind:z.enum(spec.objects as unknown as [string,...string[]])})).max(4).default([]):z.array(z.never()).max(0).default([]),
  controls:z.array(z.object({param:z.enum(keys),min:z.number().finite(),max:z.number().finite()})).max(4).default([]),
  challenge:metrics.length?z.object({metric:z.enum(metrics as [string,...string[]]),comparator:z.enum(['atLeast','atMost']),target:z.number().finite(),label:text(120).min(1)}).nullable().default(null):z.null().default(null)});}
export const gizmoDefinitionSchema=z.discriminatedUnion('engine',engines.map(variant) as unknown as [ReturnType<typeof variant>,...ReturnType<typeof variant>[]]);
export type GizmoDefinition={schemaVersion:2;engine:Engine;subject:Subject;title:string;caption:string;objective:string;instructions:string;assumptions:string[];params:Record<string,number>;visual:{accent:string;character:typeof characters[number];characterColour:string;planet:typeof planets[number]};objects:{kind:string}[];controls:{param:string;min:number;max:number}[];challenge:{metric:string;comparator:'atLeast'|'atMost';target:number;label:string}|null;feedback:{success:string;retry:string};difficulty:'gentle'|'standard'|'tricky';speed:number;prompt:string;attribution:string;sources:{title:string;page?:number;url?:string}[];provenance:z.infer<typeof provenanceSchema>};
// Rendered posts add server-controlled presentation fields.
export type Gizmo=GizmoDefinition&{id:string;creator:string;published:boolean;owned?:boolean;version?:number;authored?:boolean;feedRank?:number;counts?:{like:number;save:number;repost:number;comment:number}};
export function defaults(e:Engine){return Object.fromEntries(Object.entries(engineSpecs[e].params).map(([k,s])=>[k,s.default]));}
export function hasObject(d:Pick<GizmoDefinition,'objects'>,kind:string){return d.objects.some(o=>o.kind===kind);}
// Range a player-exposed control may take; falls back to the engine's full range.
export function controlRange(d:Pick<GizmoDefinition,'engine'|'controls'>,param:string){const s=engineSpecs[d.engine].params[param],c=d.controls.find(c=>c.param===param);return c?{min:c.min,max:c.max}:{min:s.min,max:s.max};}
function achievable(d:GizmoDefinition,metric:string):[number,number]{
 const P=d.params,range=(k:string)=>controlRange(d,k),varied=(k:string)=>d.controls.some(c=>c.param===k);
 const lo=(k:string)=>varied(k)?range(k).min:P[k],hi=(k:string)=>varied(k)?range(k).max:P[k];
 switch(d.engine){
  case 'jumper':{if(metric==='goals')return [0,Infinity];const spring=hasObject(d,'spring-pad'),v=hi('jumpSpeed'),best=spring?springLaunchSpeed(v,{springConstant:hi('springConstant'),compression:hi('compression'),mass:lo('mass')}):v;return [0,jumpHeight(best,lo('gravity'))];}
  case 'circuit':return [0,ohmsLaw(24,1)];
  case 'fractal':return [powerPerExit(P.input,8),P.input];
  case 'atom':return [P.protons-14,P.protons];
  case 'ecosystem':return metric==='power'?[0,1200*2*P.efficiency/100]:[0,Infinity];
  case 'lander':return P.thrust>P.gravity?[0,Infinity]:[0,0];
  case 'word':return [-1e4,1e4];
  default:return [0,Infinity];
 }
}
export type Issue={path:string;message:string};
// Semantic checks beyond the schema: control ranges, reachable goals and physically sensible configurations.
export function semanticIssues(d:GizmoDefinition):Issue[]{
 const issues:Issue[]=[],spec=engineSpecs[d.engine];
 d.controls.forEach((c,i)=>{const s=spec.params[c.param];if(!(c.min<c.max))issues.push({path:`controls.${i}`,message:`${s.label} needs a minimum below its maximum.`});if(c.min<s.min||c.max>s.max)issues.push({path:`controls.${i}`,message:`${s.label} must stay within ${s.min}–${s.max} ${s.unit}.`});if(d.params[c.param]<c.min||d.params[c.param]>c.max)issues.push({path:`controls.${i}`,message:`${s.label} starts outside its own control range.`});});
 if(new Set(d.controls.map(c=>c.param)).size!==d.controls.length)issues.push({path:'controls',message:'Each control may appear only once.'});
 if(d.engine==='lander'&&d.params.thrust<=d.params.gravity)issues.push({path:'params.thrust',message:'Thrust must exceed gravity, otherwise no gentle landing is possible.'});
 if(d.engine==='atom'&&d.params.electrons>d.params.protons+2)issues.push({path:'params.electrons',message:'Keep the starting model within two extra electrons of neutral.'});
 if(d.engine==='jumper'&&hasObject(d,'spring-pad')&&(d.params.springConstant<=0||d.params.compression<=0))issues.push({path:'objects',message:'A spring pad needs a positive spring constant and compression.'});
 if(d.engine==='jumper'&&d.visual.planet!=='none'&&d.visual.planet!=='custom'&&Math.abs(planetGravity[d.visual.planet]-d.params.gravity)>.05)issues.push({path:'params.gravity',message:`${d.visual.planet}'s surface gravity is about ${planetGravity[d.visual.planet]} m/s². Use that value or choose a custom planet.`});
 if(d.challenge){const [min,max]=achievable(d,d.challenge.metric),t=d.challenge.target;
  if(d.challenge.comparator==='atLeast'&&t>max)issues.push({path:'challenge.target',message:`This goal cannot be reached: the best possible ${spec.metrics[d.challenge.metric].label.toLowerCase()} is ${max.toFixed(2)} ${spec.metrics[d.challenge.metric].unit}.`});
  if(d.challenge.comparator==='atMost'&&t<min)issues.push({path:'challenge.target',message:'This goal is below the lowest achievable value.'});
  if(d.engine==='jumper'&&d.challenge.metric==='maxHeight'&&Math.abs(t-d.params.goalHeight)>1e-6)issues.push({path:'challenge.target',message:'The jump goal must match the goal ledge height.'});}
 return issues;
}
export function parseDefinition(input:unknown):GizmoDefinition{const d=gizmoDefinitionSchema.parse(input) as unknown as GizmoDefinition;const issues=semanticIssues(d);if(issues.length)throw new DefinitionError(issues);return d;}
export class DefinitionError extends Error{constructor(public issues:Issue[]){super(issues.map(i=>i.message).join(' '));}}
// Version 1 records (the original SQLite demo) carried presentation fields only. Upgrading fills engine defaults.
export const legacySchema=z.object({id:z.string().min(1).max(100),title:z.string().trim().min(1).max(70),caption:z.string().trim().min(1).max(240),engine:z.enum(engines),creator:z.string().min(1).max(40),accent:hex,speed:z.number().min(.25).max(3),published:z.boolean(),attribution:z.string().max(200),instructions:z.string().max(300),subject:z.enum(subjects).optional(),prompt:z.string().max(300).optional()});
export function upgradeDefinition(input:unknown):GizmoDefinition{
 const raw=input as {schemaVersion?:number};if(raw&&raw.schemaVersion===GIZMO_SCHEMA_VERSION)return parseDefinition(input);
 const v1=legacySchema.parse(input);
 return parseDefinition({schemaVersion:2,engine:v1.engine,subject:v1.subject||'Physics',title:v1.title,caption:v1.caption,instructions:v1.instructions,prompt:v1.prompt||'',attribution:v1.attribution,speed:v1.speed,visual:{accent:v1.accent},params:{},provenance:{kind:'manual',reviewed:false}});
}
// Diff of supported settings, used to explain what an edit actually changed.
export function describeChanges(before:GizmoDefinition|null,after:GizmoDefinition){
 const out:string[]=[];if(!before)return [`Created a ${engineSpecs[after.engine].name} gizmo.`];
 if(before.engine!==after.engine)out.push(`Changed the interaction from ${engineSpecs[before.engine].name} to ${engineSpecs[after.engine].name}.`);
 const spec=engineSpecs[after.engine].params;
 if(before.engine===after.engine)for(const [k,s] of Object.entries(spec))if(before.params[k]!==after.params[k])out.push(`${s.label}: ${before.params[k]} → ${after.params[k]} ${s.unit}`);
 const objs=(d:GizmoDefinition)=>d.objects.map(o=>o.kind).sort().join(', ');if(objs(before)!==objs(after))out.push(`Objects: ${objs(before)||'none'} → ${objs(after)||'none'}`);
 for(const k of ['character','characterColour','planet','accent'] as const)if(before.visual[k]!==after.visual[k])out.push(`${k==='characterColour'?'Character colour':k[0].toUpperCase()+k.slice(1)}: ${before.visual[k]} → ${after.visual[k]}`);
 if(JSON.stringify(before.challenge)!==JSON.stringify(after.challenge))out.push(after.challenge?`Goal: ${after.challenge.label}`:'Removed the goal.');
 if(JSON.stringify(before.controls)!==JSON.stringify(after.controls))out.push(`Player controls: ${after.controls.map(c=>spec[c.param]?.label).join(', ')||'none'}`);
 if(before.title!==after.title)out.push(`Title: “${after.title}”`);
 return out.length?out:['No supported settings changed.'];
}

import {proposalSchema,templateEngine,validateProposal,type CreatorProposal} from './creator-model';
import {engineSpecs,defaults,parseDefinition,GIZMO_SCHEMA_VERSION,type GizmoDefinition} from './gizmo-spec';
import {physicsBriefs} from './physics-demo';
// Creator-pilot projects are ordinary v2 definitions with a `world`. The world drives CreatorWorld's rendering;
// matching engine params are mirrored (clamped to the engine's range) so feed metadata and briefs stay consistent.
const mirror:Record<string,[string,string][]>={jump:[['gravity','gravity'],['launchSpeed','jumpSpeed'],['goalHeight','goalHeight']],circuit:[['voltage','voltage'],['resistance','resistance']],light:[['red','red'],['green','green'],['blue','blue']],solar:[['irradiance','irradiance'],['area','area']],waves:[]};
export function definitionFromProposal(input:CreatorProposal,base?:Pick<GizmoDefinition,'provenance'|'attribution'|'speed'|'prompt'>|null):GizmoDefinition{
 const p=validateProposal(input),engine=templateEngine[p.world.template],spec=engineSpecs[engine].params,params=defaults(engine);
 for(const [from,to] of mirror[p.world.template]){const s=spec[to],v=p.world[from as keyof typeof p.world] as number;params[to]=Math.min(s.max,Math.max(s.min,v));}
 return parseDefinition({schemaVersion:GIZMO_SCHEMA_VERSION,engine,subject:'Physics',title:p.title,caption:p.caption,instructions:p.instructions,objective:physicsBriefs[engine].concept,assumptions:[physicsBriefs[engine].model],
  params,visual:{accent:p.accent},world:p.world,speed:base?.speed??1,prompt:base?.prompt??'',attribution:base?.attribution||'Created with the interactive experiment editor',provenance:base?.provenance??{kind:'manual',reviewed:false}});
}
export function proposalFromDefinition(d:Pick<GizmoDefinition,'title'|'caption'|'instructions'|'visual'|'world'>):CreatorProposal|null{
 if(!d.world)return null;return proposalSchema.parse({title:d.title,caption:d.caption,instructions:d.instructions||'Try the controls and compare the result.',accent:d.visual.accent,world:d.world});
}

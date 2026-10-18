import {studySamples} from './study';
import {authoredDefinition,type Gizmo} from './gizmos';
// A focused ten-post topic collection. The playground remains a separate, explicit choice.
export const learningGizmos:Gizmo[]=studySamples.physics.challenges.map(c=>({...authoredDefinition({id:`lesson-${c.id}`,title:c.title,caption:c.learning!.cue,creator:'orbitclub',engine:'springs',accent:'#d1ecaa',speed:1,published:true,attribution:'Original educational demo · ideal beam model',instructions:c.clue}),id:`lesson-${c.id}`,creator:'orbitclub',published:true,authored:true}));
export function lessonForPost(id:string){return studySamples.physics.challenges.find(c=>`lesson-${c.id}`===id);}

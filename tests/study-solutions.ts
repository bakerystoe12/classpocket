import type {Challenge} from '../lib/study';
import {gradeCargo} from '../lib/study';
export function solution(c:Challenge):string{
 const g=c.game;if(!g)return c.target;
 if(g.kind==='atom')return JSON.stringify({e:g.protons-g.charge,p:c.target});
 for(let f=1;f<=6;f++)for(let d=1;d<=4;d++){
  if(g.lock==='force'&&f!==g.force||g.lock==='distance'&&d!==g.distance)continue;
  const answer=JSON.stringify({f,d,p:c.target});if(gradeCargo(c,answer).correct)return answer;
 }
 throw new Error(`No solution to ${c.id}`);
}

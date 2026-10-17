import { z } from 'zod';
const text = z.string().trim().min(1).max(4000);
const base = { id: z.string().min(1).max(80), title: text, concept: text, task: text, explanation: text, sourcePages: z.array(z.number().int().min(1)).min(1), difficulty: z.enum(['Gentle','Standard','Stretch']) };
const n = z.number().finite().min(0).max(100);
export const activitySchema = z.discriminatedUnion('type', [
 z.object({...base,type:z.literal('balance'), leftForce:n.min(0.1),leftDistance:n.min(0.1).max(5),rightForce:n.min(0.1),startDistance:n.min(0.1).max(5),maxDistance:n.min(1).max(5)}),
 z.object({...base,type:z.literal('predict'),mode:z.enum(['moment','turn']),force:n,distance:n.max(5),leftMoment:n,adjustable:z.boolean()}),
 z.object({...base,type:z.literal('sort'),categories:z.array(text).min(2).max(6),items:z.array(z.object({label:text,category:z.number().int().min(0),why:text})).min(2).max(10)})
]);
export const lessonSchema = z.object({ title:text,objectives:z.array(text).min(1).max(12),pages:z.array(z.object({page:z.number().int().positive(),text})).min(1).max(150),activities:z.array(activitySchema).max(20),attribution:z.string().max(2000),origin:z.enum(['sample','manual','ai']) });
export type Activity = z.infer<typeof activitySchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export const moment = (force:number,distance:number) => {
 if(!Number.isFinite(force)||!Number.isFinite(distance)||force<0||distance<0) throw new Error('Force and distance must be finite, non-negative numbers.');
 return Math.round(force*distance*1000)/1000;
};
export function direction(left:number,right:number) {return Math.abs(left-right)<=0.05?'Balanced':left>right?'Anticlockwise':'Clockwise';}
export function validateLesson(input:unknown):Lesson {
 const l=lessonSchema.parse(input); const pages=new Set(l.pages.map(p=>p.page)); const ids=new Set<string>();
 for(const a of l.activities){if(ids.has(a.id))throw new Error('Activity IDs must be unique.');ids.add(a.id);if(a.sourcePages.some(p=>!pages.has(p)))throw new Error('Activity refers to a missing source page.');
 if(a.type==='sort'&&a.items.some(i=>i.category>=a.categories.length))throw new Error('Invalid sorting category.');
 if(a.type==='balance'&&(a.startDistance>a.maxDistance||a.leftForce*a.leftDistance/a.rightForce>a.maxDistance))throw new Error('Balance target must be reachable.');}
 return l;
}
export function grade(a:Activity,raw:unknown):{correct:boolean;feedback:string;answer:unknown} {
 const r=z.record(z.string(),z.unknown()).parse(raw);
 if(a.type==='balance') {const distance=z.number().min(0.1).max(a.maxDistance).parse(r.distance); const prediction=z.enum(['Balanced','Clockwise','Anticlockwise']).parse(r.prediction);const left=moment(a.leftForce,a.leftDistance),right=moment(a.rightForce,distance),actual=direction(left,right);return {correct:actual==='Balanced'&&prediction===actual,feedback:`Anticlockwise: ${a.leftForce} N × ${a.leftDistance} m = ${left} Nm. Clockwise: ${a.rightForce} N × ${distance} m = ${right} Nm. ${actual==='Balanced'?'The moments are equal within 0.05 Nm. The beam balances.':`The beam turns ${actual.toLowerCase()}. Move the right weight to ${+(left/a.rightForce).toFixed(2)} m to balance it.`} ${prediction===actual?'Your prediction matched.':'Compare this result with your prediction.'} We ignore the beam’s own weight.`,answer:{distance,prediction}};}
 if(a.type==='predict'){const distance=a.adjustable?z.number().min(0.1).max(5).parse(r.distance):a.distance;const value=moment(a.force,distance); const expected=a.mode==='moment'?value:direction(a.leftMoment,value);const prediction=a.mode==='moment'?z.number().min(0).max(500).parse(r.prediction):z.enum(['Balanced','Clockwise','Anticlockwise']).parse(r.prediction);return {correct:a.mode==='moment'?Math.abs(Number(prediction)-value)<=0.05:prediction===expected,feedback:`${a.force} N × ${distance} m = ${value} Nm. ${a.mode==='turn'?`Against ${a.leftMoment} Nm anticlockwise, the result is ${String(expected).toLowerCase()}.`: 'For the same force, a larger perpendicular distance gives a larger turning effect.'} ${a.explanation}`,answer:{distance,prediction}};}
 const placements=z.array(z.number().int().min(0).max(a.categories.length-1)).length(a.items.length).parse(r.placements);const wrong=a.items.filter((i,j)=>i.category!==placements[j]);return {correct:wrong.length===0,feedback:wrong.length?wrong.map(i=>`${i.label}: ${i.why}`).join(' '):`All placed correctly. ${a.explanation}`,answer:{placements}};
}

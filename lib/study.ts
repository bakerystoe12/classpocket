import {z} from 'zod';
import {gameSchema,learningSchema,scienceSamples,gradeExperiment,validateExperiment} from './science';
const short=z.string().trim().min(1).max(200);
export const challengeSchema=z.object({id:z.string().min(1).max(80),title:short,clue:z.string().min(1).max(300),target:z.string().min(1).max(60),choices:z.array(z.string().min(1).max(60)).length(3),explanation:z.string().min(1).max(800),page:z.number().int().positive(),quote:z.string().min(1).max(1500),learning:learningSchema.optional(),game:gameSchema.optional()});
export const studySchema=z.object({title:short,topic:short,category:z.enum(['Physics','Chemistry','Biology','Mathematics','Other']),pages:z.array(z.object({page:z.number().int().positive(),text:z.string().min(1).max(30000)})).min(1).max(150),challenges:z.array(challengeSchema).length(10),origin:z.enum(['included','extractive']),sourceName:short});
export type Challenge=z.infer<typeof challengeSchema>;
export type Study=z.infer<typeof studySchema>;
export function validateStudy(input:unknown){const s=studySchema.parse(input);const ids=new Set();for(const c of s.challenges){if(ids.has(c.id))throw new Error('Mission IDs must be unique.');ids.add(c.id);if(new Set(c.choices).size!==3||!c.choices.includes(c.target))throw new Error('Each mission needs three distinct cargo labels including its target.');if(c.game)validateExperiment(c);const p=s.pages.find(p=>p.page===c.page);if(!p||!p.text.includes(c.quote))throw new Error('A source quote must match its cited page exactly.');}return s;}
export const studySamples=scienceSamples();
export function draftFromPages(pages:Study['pages'],title:string,category:Study['category']):Study{
 const entries:{term:string;definition:string;quote:string;page:number}[]=[];
 for(const p of pages){for(const line of p.text.split(/\n|(?<=[.!?])\s+/)){const m=line.trim().match(/^([^:]{2,50}):\s*(.{12,})$/);if(m&&m[2].length<=280)entries.push({term:m[1].trim(),definition:m[2].trim(),quote:line.trim(),page:p.page});}
 }
 if(entries.length<3){for(const p of pages){for(const raw of p.text.match(/[^.!?\n]+[.!?]?/g)||[]){const quote=raw.trim();if(quote.length<25||quote.length>280)continue;const words=quote.match(/[A-Za-z][A-Za-z-]{4,}/g)||[];const term=words.find(w=>!['which','there','these','those','their','about','through','because','where','while','being'].includes(w.toLowerCase()));if(term&&!entries.some(e=>e.term.toLowerCase()===term.toLowerCase()))entries.push({term,definition:quote.replace(term,'_____'),quote,page:p.page});}}
 }
 const distinct=entries.filter((e,i,a)=>a.findIndex(x=>x.term.toLowerCase()===e.term.toLowerCase())===i);
 if(distinct.length<3)throw new Error('We need at least three distinct terms or readable sentences to fill this template. Paste more notes, use “Term: definition” lines, or open the included sample.');
 return validateStudy({title,topic:title,category,pages,origin:'extractive',sourceName:'Teacher-provided lesson notes',challenges:Array.from({length:10},(_,i)=>{const k=i%distinct.length,e=distinct[k];return {id:`mission-${i+1}`,title:`${i+1}. ${e.term} delivery`,clue:e.definition,target:e.term,choices:[e.term,distinct[(k+1)%distinct.length].term,distinct[(k+2)%distinct.length].term],explanation:e.quote,quote:e.quote,page:e.page};})});
}
export function practiceBatch(base:Challenge[],batch:number){return Array.from({length:10},(_,i)=>{const c=base[(i+batch*3)%base.length];return {...c,id:`practice-${batch}-${i+1}`,title:`${c.title.replace(/^\d+\. /,'')} · practice ${batch}`,choices:[...c.choices.slice((i+batch)%3),...c.choices.slice(0,(i+batch)%3)]};});}
export function gradeCargo(c:Challenge,cargo:string){if(c.game)return gradeExperiment(c,cargo);if(!c.choices.includes(cargo))throw new Error('Cargo is not part of this mission.');return {correct:cargo===c.target,feedback:cargo===c.target?`Delivered. ${c.explanation}`:`That cargo does not match this clue. ${c.explanation}`};}

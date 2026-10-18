import {z} from 'zod';
import {subjects} from './gizmo-spec';
// Timetable semantics (shared by browser and server):
//  * Slots are wall-clock times in the timetable's IANA time zone, at minute resolution.
//  * Start is inclusive and end is exclusive, so adjacent periods switch exactly at the bell.
//  * A slot cannot cross midnight; "24:00" is accepted as an end time meaning end of that day.
//    Overnight classes are split into two rows.
//  * Daylight saving: evaluation uses the local wall clock. On a spring-forward day the skipped
//    wall-clock minutes never occur, so a slot inside the gap is shortened or skipped. On a
//    fall-back day the repeated hour occurs twice and a slot covering it is active both times.
//  * Policy decisions use the server's clock. The browser only displays a server-offset clock.
const clock=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/,'Use HH:MM.');
const endClock=z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/,'Use HH:MM.');
export const slotSchema=z.object({id:z.string().min(1).max(60),name:z.string().trim().min(1).max(60),subject:z.enum(subjects),days:z.array(z.number().int().min(0).max(6)).min(1).max(7).refine(a=>new Set(a).size===a.length,'Days must be unique.'),start:clock,end:endClock});
export const timezoneSchema=z.string().min(1).max(80).refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return v.includes('/')||v==='UTC';}catch{return false;}},'Use a valid IANA time zone such as Australia/Sydney.');
export const scheduleSchema=z.object({title:z.string().trim().min(1).max(70),timezone:timezoneSchema,enabled:z.boolean(),slots:z.array(slotSchema).max(40)});
export type Schedule=z.infer<typeof scheduleSchema>;
export type Slot=z.infer<typeof slotSchema>;
export type PreviewClock={day:number;minute:number};
export const minutes=(s:string)=>Number(s.slice(0,2))*60+Number(s.slice(3));
export function validateSchedule(input:unknown):Schedule{
 const s=scheduleSchema.parse(input),ids=new Set<string>();
 for(const slot of s.slots){if(ids.has(slot.id))throw new Error('Timetable rows need unique IDs.');ids.add(slot.id);if(minutes(slot.end)<=minutes(slot.start))throw new Error(`“${slot.name}” must end after it starts. Split overnight classes into two days.`);}
 for(let i=0;i<s.slots.length;i++)for(let j=i+1;j<s.slots.length;j++){const a=s.slots[i],b=s.slots[j];if(a.days.some(d=>b.days.includes(d))&&minutes(a.start)<minutes(b.end)&&minutes(b.start)<minutes(a.end))throw new Error(`“${a.name}” and “${b.name}” overlap. End one class before the next begins.`);}
 return s;
}
const formatters=new Map<string,Intl.DateTimeFormat>();
function formatter(timezone:string){let f=formatters.get(timezone);if(!f){f=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,weekday:'short',hour:'2-digit',minute:'2-digit',year:'numeric',month:'2-digit',day:'2-digit',hourCycle:'h23'});formatters.set(timezone,f);}return f;}
export function localTime(date:Date,timezone:string){const parts=formatter(timezone).formatToParts(date),get=(type:string)=>parts.find(p=>p.type===type)?.value||'';return {day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(get('weekday')),minute:Number(get('hour'))*60+Number(get('minute')),label:`${get('weekday')} ${get('hour')}:${get('minute')}`,date:`${get('year')}-${get('month')}-${get('day')}`};}
export function activeSlot(schedule:Schedule,date:Date,preview?:PreviewClock|null){if(!schedule.enabled)return null;const wall=preview||localTime(date,schedule.timezone);return schedule.slots.find(s=>s.days.includes(wall.day)&&wall.minute>=minutes(s.start)&&wall.minute<minutes(s.end))||null;}
export function blankSchedule(timezone='Australia/Sydney'):Schedule{return {title:'My school week',timezone,enabled:false,slots:[]};}
export function demoSchedule(timezone='Australia/Sydney'):Schedule{return {title:'Demo school day',timezone,enabled:true,slots:[{id:'physics',name:'Physics lab',subject:'Physics',days:[1,2,3,4,5],start:'09:00',end:'09:45'},{id:'chemistry',name:'Chemistry studio',subject:'Chemistry',days:[1,2,3,4,5],start:'09:45',end:'10:30'},{id:'maths',name:'Maths',subject:'Maths',days:[1,2,3,4,5],start:'10:45',end:'11:30'},{id:'art',name:'Art & design',subject:'Art',days:[1,2,3,4,5],start:'11:30',end:'12:15'}]};}
// The judge preview uses the isolated demo school day and can only narrow the feed:
// a real class on the saved timetable always wins over the preview.
export function feedPolicy(effective:Schedule,now:Date,preview?:PreviewClock|null){
 const real=activeSlot(effective,now);
 if(real)return {subject:real.subject,source:'class' as const,slot:real,schedule:effective,preview:null};
 if(preview){const demo=demoSchedule(effective.timezone),slot=activeSlot(demo,now,preview);return {subject:slot?.subject||null,source:'preview' as const,slot,schedule:demo,preview};}
 return {subject:null,source:'free' as const,slot:null,schedule:effective,preview:null};
}
export function parsePreview(raw:string|null|undefined):PreviewClock|null{const m=raw?.match(/^([0-6]):(\d{1,4})$/);if(!m)return null;const minute=Number(m[2]);return minute<1440?{day:Number(m[1]),minute}:null;}
export type Room={code:string;title:string;owner:boolean;createdAt:string;members:{name:string;handle:string}[];post?:import('./gizmo-spec').Gizmo};
export type Enrolment={code:string;title:string;updatedAt:string;students:{id:string;name:string;handle:string}[]};
export type RhythmState={own:Schedule;effective:Schedule;link:{code:string;title:string}|null;isTeacher:boolean;rooms:Room[];enrolments:Enrolment[];serverNow:string};

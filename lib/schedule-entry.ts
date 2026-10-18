import {activeSlot,localTime,minutes,type Schedule} from './rhythm';
export function scheduleEntry(schedule:Schedule,date:Date,preview?:{day:number;minute:number}){
 const wall=preview||localTime(date,schedule.timezone),current=activeSlot(schedule,date,preview);
 const upcoming=schedule.enabled?schedule.slots.filter(s=>s.days.includes(wall.day)&&minutes(s.end)>wall.minute).sort((a,b)=>minutes(a.start)-minutes(b.start)):[];
 const dateKey=preview?'preview-day-'+wall.day:new Intl.DateTimeFormat('en-CA',{timeZone:schedule.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
 const period=current?[current.id,current.subject,current.start,current.end].join(':'):'free-until-'+(upcoming[0]?.id||'end-of-day');
 return {key:[dateKey,schedule.timezone,schedule.enabled,period].join('|'),current,upcoming:upcoming.slice(0,3),timezone:schedule.timezone,enabled:schedule.enabled,isPreview:!!preview};
}

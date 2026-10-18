import {test} from 'node:test';
import assert from 'node:assert/strict';
import {activeSlot,demoSchedule,validateSchedule,localTime,feedPolicy,parsePreview,blankSchedule,type Schedule} from '../../lib/rhythm';
import {scheduleEntry} from '../../lib/schedule-entry';
const at=(iso:string)=>new Date(iso);
test('start is inclusive, end exclusive; adjacent periods switch at the bell; free time after class',()=>{
 const s=demoSchedule('UTC');
 assert.equal(activeSlot(s,at('2026-10-19T09:00:00Z'))?.subject,'Physics');
 assert.equal(activeSlot(s,at('2026-10-19T09:44:59Z'))?.subject,'Physics');
 assert.equal(activeSlot(s,at('2026-10-19T09:45:00Z'))?.subject,'Chemistry');
 assert.equal(activeSlot(s,at('2026-10-19T08:59:59Z')),null);
 assert.equal(activeSlot(s,at('2026-10-19T12:15:00Z')),null);
 assert.equal(activeSlot(s,at('2026-10-18T09:10:00Z')),null,'Sunday has no classes');
 assert.equal(activeSlot({...s,enabled:false},at('2026-10-19T09:10:00Z')),null);
});
test('the timetable zone decides the weekday and minute, including across UTC midnight',()=>{
 assert.equal(localTime(at('2026-10-18T22:10:00Z'),'Australia/Sydney').label,'Mon 09:10');
 assert.equal(activeSlot(demoSchedule('Australia/Sydney'),at('2026-10-18T22:10:00Z'))?.subject,'Physics');
 const late:Schedule={title:'Late',timezone:'UTC',enabled:true,slots:[{id:'a',name:'Night study',subject:'Physics',days:[1],start:'23:30',end:'24:00'},{id:'b',name:'Early',subject:'Maths',days:[2],start:'00:00',end:'00:30'}]};
 assert.ok(validateSchedule(late));
 assert.equal(activeSlot(late,at('2026-10-19T23:59:00Z'))?.id,'a');
 assert.equal(activeSlot(late,at('2026-10-20T00:00:00Z'))?.id,'b','midnight starts the next day’s slot');
});
test('daylight saving: skipped wall-clock minutes never occur; repeated hour is active twice',()=>{
 // Sydney springs forward on Sun 4 Oct 2026 at 02:00 → 03:00.
 const gap:Schedule={title:'DST',timezone:'Australia/Sydney',enabled:true,slots:[{id:'g',name:'Gap class',subject:'Physics',days:[0],start:'02:00',end:'03:00'},{id:'h',name:'After',subject:'Maths',days:[0],start:'03:00',end:'04:00'}]};
 assert.equal(activeSlot(gap,at('2026-10-03T15:59:00Z')),null,'01:59 local');
 assert.equal(activeSlot(gap,at('2026-10-03T16:00:00Z'))?.id,'h','one minute later it is already 03:00 local');
 // New York falls back on Sun 1 Nov 2026 at 02:00 → 01:00.
 const ny:Schedule={title:'DST',timezone:'America/New_York',enabled:true,slots:[{id:'r',name:'Repeat',subject:'Physics',days:[0],start:'01:00',end:'02:00'}]};
 assert.equal(activeSlot(ny,at('2026-11-01T05:30:00Z'))?.id,'r','first 01:30 (EDT)');
 assert.equal(activeSlot(ny,at('2026-11-01T06:30:00Z'))?.id,'r','second 01:30 (EST)');
 assert.equal(activeSlot(ny,at('2026-11-01T07:00:00Z')),null,'02:00 EST');
});
test('overlaps, backwards rows, duplicate IDs and invalid zones are rejected',()=>{
 const s=demoSchedule();assert.ok(validateSchedule(s));
 const overlap=structuredClone(s);overlap.slots[1].start='09:30';assert.throws(()=>validateSchedule(overlap),/overlap/);
 const backwards=structuredClone(s);backwards.slots[0].end='08:00';assert.throws(()=>validateSchedule(backwards));
 const badZone=structuredClone(s);badZone.timezone='made/up';assert.throws(()=>validateSchedule(badZone));
 const duplicate=structuredClone(s);duplicate.slots[1].id=duplicate.slots[0].id;assert.throws(()=>validateSchedule(duplicate));
 const adjacent=structuredClone(s);assert.equal(adjacent.slots[0].end,adjacent.slots[1].start);assert.ok(validateSchedule(adjacent),'touching periods are allowed');
});
test('feed policy: a real class wins, preview can only narrow, and free time is unrestricted',()=>{
 const real={...demoSchedule('UTC'),slots:[{id:'p',name:'Physics',subject:'Physics' as const,days:[1],start:'09:00',end:'10:00'}]};
 const inClass=feedPolicy(real,at('2026-10-19T09:10:00Z'),{day:1,minute:770});
 assert.equal(inClass.subject,'Physics');assert.equal(inClass.source,'class');
 const free=feedPolicy(real,at('2026-10-19T13:00:00Z'));assert.equal(free.subject,null);assert.equal(free.source,'free');
 const preview=feedPolicy(blankSchedule('UTC'),at('2026-10-19T13:00:00Z'),{day:1,minute:590});assert.equal(preview.subject,'Chemistry');assert.equal(preview.source,'preview');
 assert.equal(feedPolicy(blankSchedule('UTC'),at('2026-10-19T13:00:00Z'),{day:1,minute:770}).subject,null);
 assert.deepEqual(parsePreview('1:550'),{day:1,minute:550});assert.equal(parsePreview('9:550'),null);assert.equal(parsePreview('1:2000'),null);assert.equal(parsePreview('x'),null);
});
test('the welcome key is stable inside a period and changes at the bell',()=>{
 const s=demoSchedule('UTC'),a=scheduleEntry(s,at('2026-10-19T09:10:00Z')),b=scheduleEntry(s,at('2026-10-19T09:44:59Z')),c=scheduleEntry(s,at('2026-10-19T09:45:00Z'));
 assert.equal(a.current?.subject,'Physics');assert.equal(a.key,b.key);assert.notEqual(a.key,c.key);assert.equal(c.current?.subject,'Chemistry');
 const demo=scheduleEntry(s,at('2026-10-18T12:00:00Z'),{day:1,minute:550});assert.equal(demo.current?.subject,'Physics');assert.equal(demo.isPreview,true);
});

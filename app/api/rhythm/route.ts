import {NextRequest,NextResponse} from 'next/server';
import {randomBytes} from 'node:crypto';
import {database as db,session,now} from '@/lib/db';
import {blankSchedule,validateSchedule,type Schedule} from '@/lib/rhythm';
import {gizmos,type Gizmo} from '@/lib/gizmos';
import {z} from 'zod';
export const runtime='nodejs';export const dynamic='force-dynamic';
db.exec(`CREATE TABLE IF NOT EXISTS rhythm_settings(user TEXT PRIMARY KEY,content TEXT NOT NULL,linked TEXT);
CREATE TABLE IF NOT EXISTS rhythm_codes(code TEXT PRIMARY KEY,owner TEXT NOT NULL,kind TEXT NOT NULL,content TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS gizmo_rooms(code TEXT PRIMARY KEY,owner TEXT NOT NULL,content TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS gizmo_members(code TEXT NOT NULL,user TEXT NOT NULL,created TEXT NOT NULL,PRIMARY KEY(code,user));`);
type Settings={content:string;linked:string|null};type Pack={code:string;owner:string;kind:string;content:string};
function settings(user:string){return db.prepare('SELECT content,linked FROM rhythm_settings WHERE user=?').get(user) as Settings|undefined;}
function pack(code:string){const p=db.prepare('SELECT * FROM rhythm_codes WHERE code=?').get(code) as Pack|undefined;if(!p)throw new Error('Schedule code not found.');return p;}
function code(){return randomBytes(6).toString('hex').toUpperCase();}
function state(user:string,isTeacher:boolean){const row=settings(user),own:Schedule=row?JSON.parse(row.content):blankSchedule(),linked=row?.linked?pack(row.linked):null;const rooms=db.prepare('SELECT DISTINCT r.* FROM gizmo_rooms r JOIN gizmo_members m ON m.code=r.code WHERE m.user=? OR r.owner=? ORDER BY r.created DESC').all(user,user);return {own,effective:linked?JSON.parse(linked.content):own,link:linked?{code:linked.code,title:JSON.parse(linked.content).title}:null,isTeacher,rooms:rooms.map(r=>({code:r.code,post:JSON.parse(String(r.content)),owner:r.owner===user,members:db.prepare('SELECT p.name,p.handle FROM gizmo_members m JOIN social_profiles p ON p.id=m.user WHERE m.code=? ORDER BY m.created').all(r.code)}))};}
async function handler(req:NextRequest){try{
 const user=req.cookies.get('cp_social')?.value;if(!user||!db.prepare('SELECT id FROM social_profiles WHERE id=?').get(user))return NextResponse.json({error:'Open the app to create your guest profile first.'},{status:401});
 const isTeacher=session(req.cookies.get('cp_teacher')?.value)?.role==='teacher';
 if(req.method==='GET'){
  const share=req.nextUrl.searchParams.get('schedule'),room=req.nextUrl.searchParams.get('room');
  if(share){const p=pack(share.toUpperCase());return NextResponse.json({code:p.code,kind:p.kind,schedule:JSON.parse(p.content)},{headers:{'Cache-Control':'no-store'}});}
  if(room){const r=db.prepare('SELECT code,content FROM gizmo_rooms WHERE code=?').get(room.toUpperCase());if(!r)throw new Error('Invite not found. Check the room code.');return NextResponse.json({code:r.code,post:JSON.parse(String(r.content))},{headers:{'Cache-Control':'no-store'}});}
  return NextResponse.json(state(user,isTeacher),{headers:{'Cache-Control':'no-store'}});
 }
 if(req.headers.get('origin')&&new URL(req.headers.get('origin')!).host!==req.headers.get('host'))return NextResponse.json({error:'Origin not allowed.'},{status:403});
 const b=await req.json();
 if(b.action==='schedule-save'){
  const row=settings(user);if(row?.linked&&!isTeacher)return NextResponse.json({error:'Teacher-managed timetable. A teacher must unlock it before changing it.'},{status:403});
  const content=validateSchedule(b.schedule);db.prepare('INSERT INTO rhythm_settings VALUES(?,?,?) ON CONFLICT(user) DO UPDATE SET content=excluded.content').run(user,JSON.stringify(content),row?.linked||null);
  if(isTeacher)db.prepare("UPDATE rhythm_codes SET content=? WHERE owner=? AND kind='teacher'").run(JSON.stringify(content),user);
 }
 else if(b.action==='schedule-share'){
  const kind=z.enum(['personal','teacher']).parse(b.kind);if(kind==='teacher'&&!isTeacher)return NextResponse.json({error:'Teacher sign-in required to publish a managed timetable.'},{status:403});
  const row=settings(user),content=validateSchedule(row?JSON.parse(row.content):blankSchedule());if(!content.enabled||!content.slots.length)throw new Error('Save an enabled timetable with at least one class before sharing.');
  const key=code();db.prepare('INSERT INTO rhythm_codes VALUES(?,?,?,?,?)').run(key,user,kind,JSON.stringify(content),now());return NextResponse.json({...state(user,isTeacher),shared:{code:key,kind}});
 }
 else if(b.action==='schedule-join'){
  if(settings(user)?.linked&&!isTeacher)return NextResponse.json({error:'Ask a teacher to unlock the current managed timetable before changing schedules.'},{status:403});
  const p=pack(z.string().regex(/^[A-Z0-9]{12}$/).parse(String(b.code).toUpperCase())),content=validateSchedule(JSON.parse(p.content));
  db.prepare('INSERT INTO rhythm_settings VALUES(?,?,?) ON CONFLICT(user) DO UPDATE SET content=excluded.content,linked=excluded.linked').run(user,JSON.stringify(content),p.kind==='teacher'?p.code:null);
 }
 else if(b.action==='schedule-unlock'){
  if(!isTeacher)return NextResponse.json({error:'Teacher sign-in required to unlock this timetable.'},{status:403});db.prepare('UPDATE rhythm_settings SET linked=NULL WHERE user=?').run(user);
 }
 else if(b.action==='room-create'){
  const id=z.string().max(100).parse(b.post),row=db.prepare('SELECT owner,content FROM social_posts WHERE id=?').get(id) as {owner:string;content:string}|undefined;
  if(!row||row.owner!==user)return NextResponse.json({error:'Save your own custom gizmo before inviting friends.'},{status:403});
  const key=code();db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO gizmo_rooms VALUES(?,?,?,?)').run(key,user,row.content,now());db.prepare('INSERT INTO gizmo_members VALUES(?,?,?)').run(key,user,now());db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
  return NextResponse.json({...state(user,isTeacher),invite:{code:key}});
 }
 else if(b.action==='room-join'){
  const key=z.string().regex(/^[A-Z0-9]{12}$/).parse(String(b.code).toUpperCase());if(!db.prepare('SELECT code FROM gizmo_rooms WHERE code=?').get(key))throw new Error('Room not found. Check the invite code.');db.prepare('INSERT OR IGNORE INTO gizmo_members VALUES(?,?,?)').run(key,user,now());
 }
 else throw new Error('Unknown schedule or invite action.');
 return NextResponse.json(state(user,isTeacher));
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Could not save.'},{status:400});}}
export {handler as GET,handler as POST};

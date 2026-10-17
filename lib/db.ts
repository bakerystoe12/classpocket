import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync,readFileSync,writeFileSync } from 'node:fs';
import path from 'node:path';
import { randomBytes,randomUUID } from 'node:crypto';
import { Lesson,validateLesson } from './model';
const dir=process.env.DATA_DIR||path.join(process.cwd(),'data');mkdirSync(dir,{recursive:true});
const db=new DatabaseSync(path.join(dir,'classpocket.sqlite'));db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS lessons(id TEXT PRIMARY KEY, content TEXT NOT NULL, version INTEGER NOT NULL, updated TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS versions(id TEXT PRIMARY KEY,lesson TEXT NOT NULL,version INTEGER NOT NULL,content TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS publications(code TEXT PRIMARY KEY,lesson TEXT NOT NULL,version INTEGER NOT NULL,content TEXT NOT NULL,created TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,role TEXT NOT NULL,code TEXT,nickname TEXT,created TEXT NOT NULL,completed TEXT);
CREATE TABLE IF NOT EXISTS attempts(id TEXT PRIMARY KEY,session TEXT NOT NULL,code TEXT NOT NULL,activity TEXT NOT NULL,correct INTEGER NOT NULL,answer TEXT NOT NULL,feedback TEXT NOT NULL,created TEXT NOT NULL);
`);
const passFile=path.join(dir,'teacher-password.txt');
export const teacherPassword=process.env.TEACHER_PASSWORD || (existsSync(passFile)?readFileSync(passFile,'utf8').trim():randomBytes(9).toString('base64url'));
if(!process.env.TEACHER_PASSWORD&&!existsSync(passFile)) {writeFileSync(passFile,teacherPassword,{mode:0o600});console.log(`\nClassPocket demo teacher password: ${teacherPassword}\n`);}
export const database=db;
export const now=()=>new Date().toISOString();
export function getLesson(id:string){const row=db.prepare('SELECT * FROM lessons WHERE id=?').get(id) as {id:string;content:string;version:number;updated:string}|undefined;if(!row)throw new Error('Lesson not found.');return {...row,content:JSON.parse(row.content) as Lesson};}
export function saveLesson(input:unknown,id?:string,expected?:number){const content=validateLesson(input);const key=id||randomUUID();db.exec('BEGIN IMMEDIATE');try{const version=id?getLesson(id).version+1:1;if(id&&expected!==version-1)throw new Error('This draft changed in another tab. Reload before saving.');const date=now();db.prepare('INSERT OR REPLACE INTO lessons VALUES(?,?,?,?)').run(key,JSON.stringify(content),version,date);db.prepare('INSERT INTO versions VALUES(?,?,?,?,?)').run(randomUUID(),key,version,JSON.stringify(content),date);db.exec('COMMIT');return getLesson(key);}catch(e){db.exec('ROLLBACK');throw e;}}
export function publish(id:string,expected:number){const l=getLesson(id);if(l.version!==expected)throw new Error('Draft changed. Review the latest version before publishing.');if(!l.content.activities.length)throw new Error('Add at least one activity before publishing.');const code=randomBytes(4).toString('hex').slice(0,6).toUpperCase();db.prepare('INSERT INTO publications VALUES(?,?,?,?,?)').run(code,id,l.version,JSON.stringify(l.content),now());return {code,version:l.version};}
export function publication(code:string){const row=db.prepare('SELECT * FROM publications WHERE code=?').get(code.toUpperCase()) as {code:string;lesson:string;version:number;content:string}|undefined;if(!row)throw new Error('Class code not found. Check the six characters with your teacher.');return {...row,content:JSON.parse(row.content) as Lesson};}
export function session(token:string|undefined){const s=token?db.prepare('SELECT * FROM sessions WHERE token=?').get(token) as {token:string;role:string;code:string;nickname:string;completed:string;created:string}|undefined:undefined;if(s&&Date.now()-new Date(s.created).getTime()>(s.role==='teacher'?86400000:604800000))return undefined;return s;}

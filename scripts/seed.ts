// Idempotent seed of reviewed, authored content: the twenty Physics gizmos, the ten-post Moments lab
// and the two included topic sessions. Safe to re-run; it never touches user-created rows.
import {admin} from './_env';
import {gizmos} from '../lib/gizmos';
import {learningGizmos} from '../lib/learning-feed';
import {studySamples} from '../lib/study';
import {GIZMO_SCHEMA_VERSION,type Gizmo} from '../lib/gizmo-spec';
const db=admin();
const base=Date.parse('2000-01-01T00:00:00Z');
function row(g:Gizmo,i:number,kind:'gizmo'|'lesson'){const {id,creator,published,authored,feedRank,owned,version,counts,...definition}=g;void published;void authored;void feedRank;void owned;void version;void counts;
 return {id,kind,owner_id:null,authored:true,creator_persona:creator,creator_handle:creator,is_public:true,definition,schema_version:GIZMO_SCHEMA_VERSION,published_version:1,feed_sort:new Date(base-i*1000).toISOString(),subject:definition.subject,engine:definition.engine,title:definition.title,caption:definition.caption,ai_generated:false};}
const rows=[...gizmos.map((g,i)=>row(g,i,'gizmo')),...learningGizmos.map((g,i)=>row(g,i,'lesson'))];
const {error}=await db.from('gizmos').upsert(rows,{onConflict:'id'});
if(error){console.error('Seeding gizmos failed:',error.message);process.exit(1);}
const assignments=[{code:'PHYS02',content:studySamples.physics},{code:'CHEM02',content:studySamples.chemistry}].map(a=>({...a,version:1,owner_id:null,draft_id:null}));
const {error:e2}=await db.from('study_assignments').upsert(assignments,{onConflict:'code',ignoreDuplicates:true});
if(e2){console.error('Seeding topic sessions failed:',e2.message);process.exit(1);}
console.log(`Seeded ${gizmos.length} authored gizmos, ${learningGizmos.length} lesson posts and ${assignments.length} included topic sessions.`);

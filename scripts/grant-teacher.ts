// Documented admin operation: create (or find) a teacher account and grant the teacher role.
// Usage: npm run admin:teacher -- teacher@school.example "Display Name"
// The password is read from TEACHER_INITIAL_PASSWORD or generated and printed once.
import {randomBytes} from 'node:crypto';
import {admin} from './_env';
const [email,name='Teacher']=process.argv.slice(2);
if(!email||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){console.error('Usage: npm run admin:teacher -- teacher@school.example "Display Name"');process.exit(1);}
const db=admin();
let userId:string|undefined;
for(let page=1;page<50&&!userId;page++){const {data,error}=await db.auth.admin.listUsers({page,perPage:200});if(error){console.error(error.message);process.exit(1);}userId=data.users.find(u=>u.email?.toLowerCase()===email.toLowerCase())?.id;if(data.users.length<200)break;}
let password:string|undefined;
if(!userId){password=process.env.TEACHER_INITIAL_PASSWORD||randomBytes(12).toString('base64url');const {data,error}=await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name}});if(error){console.error('Could not create the teacher:',error.message);process.exit(1);}userId=data.user.id;}
await db.from('profiles').update({name:name.slice(0,40),is_guest:false}).eq('id',userId);
const {error}=await db.from('user_roles').upsert({user_id:userId,role:'teacher',note:'granted by scripts/grant-teacher.ts'},{onConflict:'user_id,role'});
if(error){console.error('Could not grant the role:',error.message);process.exit(1);}
console.log(`Teacher role granted to ${email}.`+(password&&!process.env.TEACHER_INITIAL_PASSWORD?` Initial password (shown once): ${password}`:''));

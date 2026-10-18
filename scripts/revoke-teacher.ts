// Usage: npm run admin:revoke-teacher -- teacher@school.example
import {admin} from './_env';
const email=process.argv[2];if(!email){console.error('Usage: npm run admin:revoke-teacher -- teacher@school.example');process.exit(1);}
const db=admin();let id:string|undefined;
for(let page=1;page<50&&!id;page++){const {data}=await db.auth.admin.listUsers({page,perPage:200});id=data?.users.find(u=>u.email?.toLowerCase()===email.toLowerCase())?.id;if(!data||data.users.length<200)break;}
if(!id){console.error('No such user.');process.exit(1);}
const {error}=await db.from('user_roles').delete().eq('user_id',id).eq('role','teacher');if(error){console.error(error.message);process.exit(1);}console.log('Teacher role removed.');

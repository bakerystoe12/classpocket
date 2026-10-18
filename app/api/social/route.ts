import {z} from 'zod';
import {route,json,readJson,HttpError} from '@/lib/server/http';
import {requireActor} from '@/lib/server/auth';
import * as social from '@/lib/server/social';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const GET=route(async req=>{
 const actor=await requireActor(),q=req.nextUrl.searchParams;
 if(q.get('comments'))return json({comments:await social.comments(actor,q.get('comments')!)});
 if(q.get('draft'))return json(await social.draft(actor,q.get('draft')!));
 if(q.get('profile'))return json(await social.profileView(actor,q.get('profile')!,q.get('cursor')));
 const list=q.get('list');
 if(list){const kind=z.enum(['posts','like','save','repost']).parse(list);return json({posts:kind==='posts'?await social.myPublished(actor):await social.reactionList(actor,kind)});}
 return json(await social.me(actor));
});
export const POST=route(async req=>{
 const actor=await requireActor(),b=await readJson(req);
 switch(b.action){
  case 'reaction':return json(await social.setReaction(actor,b));
  case 'follow':await social.setFollow(actor,b);return json(await social.me(actor));
  case 'comment':return json({comments:await social.addComment(actor,b)});
  case 'report':await social.report(actor,b);return json({ok:true});
  case 'profile':await social.updateProfile(actor,b.profile);return json(await social.me(actor));
  case 'save':{const saved=await social.saveManual(actor,b);return json(await social.draft(actor,saved.id));}
  case 'publish':{await social.publish(actor,b);return json(await social.draft(actor,String(b.id)));}
  case 'unpublish':await social.unpublish(actor,b);return json(await social.draft(actor,String(b.id)));
  case 'restore':{const r=await social.restore(actor,b);return json(await social.draft(actor,r.id));}
  case 'remix':{const r=await social.remix(actor,b);return json(await social.draft(actor,r.id));}
  case 'delete-account':if(b.confirm!=='DELETE')throw new HttpError(400,'Type DELETE to confirm.');await social.deleteAccount(actor);await actor.supabase.auth.signOut().catch(()=>{});return json({deleted:true});
  default:throw new HttpError(400,'Unknown action.');
 }
});

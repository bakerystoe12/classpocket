// MOCK of Groq's OpenAI-compatible chat completions endpoint, for tests only.
// It returns hand-written fixtures; passing tests against it does not prove a live model works.
import {createServer} from 'node:http';
import * as fx from './fixtures/model-outputs';
import {proposalFor} from '../lib/creator-model';
export function startMockGroq(port=4010){
 const log:{at:number;body:unknown}[]=[];
 const server=createServer(async(req,res)=>{
  if(req.url==='/__log'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(log));return;}
  if(req.url==='/__reset'){log.length=0;res.end('{}');return;}
  let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw||'{}');log.push({at:Date.now(),body});
  if(req.headers.authorization!=='Bearer test-groq-key'){res.writeHead(401);res.end('{"error":{"message":"bad key"}}');return;}
  const user=String(body.messages?.at(-1)?.content||''),name=body.response_format?.json_schema?.name;
  const send=(content:unknown,finish='stop')=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({choices:[{finish_reason:finish,message:{content:typeof content==='string'?content:JSON.stringify(content)}}],usage:{prompt_tokens:900,completion_tokens:300}}));};
  if(/ratelimit/i.test(user)){res.writeHead(429,{'retry-after':'7','Content-Type':'application/json'});res.end('{"error":{"message":"rate limited"}}');return;}
  if(/slowpoke/i.test(user)){await new Promise(r=>setTimeout(r,8000));if(!res.destroyed)send(fx.catPlanet);return;}
  if(/badjson/i.test(user))return send('{not json');
  if(/cutoff/i.test(user))return send('{"engine":"jum',"length");
  if(name==='classpocket_world'){if(/refuse-me/i.test(user)){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({choices:[{finish_reason:'stop',message:{content:null,refusal:'Unsupported request'}}]}));return;}const p=proposalFor('jump');p.world.gravity=/unreachable/i.test(user)?25:1.62;p.accent='#f28c28';return send(p);}
  if(name==='ideas')return send({refused:false,ideas:['A cat that jumps on every planet in the solar system','A lander that must touch down on Titan','A spring pad that launches a goblin over a wall']});
  if(/refuse-me/i.test(user))return send(fx.refusal);
  if(/unreachable|cannot be reached/i.test(user))return send(fx.unreachable);
  if(/fixme/i.test(user))return send(/failed validation/.test(user)?fx.catPlanet:fx.wrongEngineParam);
  if(/Change the current gizmo/.test(user))return send(fx.marsSpringOrange);
  if(name==='lesson_draft')return send({lesson:{title:'Moments',objectives:['Calculate moments'],activities:[{id:'m1',type:'predict',title:'Turn it',concept:'Moment',task:'Predict the turn',explanation:'Force × distance',sourcePages:[1],difficulty:'Gentle',mode:'turn',force:2,distance:3,leftMoment:4,adjustable:false}]}});
  return send(fx.catPlanet);
 });
 return new Promise<{close:()=>Promise<void>;port:number}>(resolve=>server.listen(port,'127.0.0.1',()=>resolve({port,close:()=>new Promise(r=>server.close(()=>r()))})));
}
if(process.argv[1]?.endsWith('mock-groq.ts'))void startMockGroq(Number(process.env.MOCK_GROQ_PORT||4010)).then(s=>console.log(`MOCK Groq listening on http://127.0.0.1:${s.port}`));

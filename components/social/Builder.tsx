'use client';
import {useState} from 'react';
import {SlidersHorizontal,History,Sparkles,RotateCcw,ArrowUpRight,AlertTriangle,Undo2} from 'lucide-react';
import GizmoCanvas from './GizmoCanvas';
import {call,ApiError} from './client';
import {engines,engineSpecs,characters,planets,subjects,defaults,controlRange,type Gizmo,type Engine} from '@/lib/gizmo-spec';
import {templateById} from '@/lib/gizmos';
import {planetGravity} from '@/lib/physics-demo';
export type Version={version:number;created:string;note:string;kind:string|null};
export type DraftResponse={draft:Gizmo;versions:Version[];publishedVersion:number|null;changes?:string[];unsupported?:string[];summary?:string;remaining?:number;repaired?:boolean};
type Props={initial:DraftResponse;ai:{provider:string;model:string}|null;backend:boolean;startPrompt?:string;onChange:(d:DraftResponse)=>void;onPublished:(g:Gizmo)=>void;notify:(s:string)=>void};
const kindLabel:Record<string,string>={ai:'AI draft · not yet reviewed',template:'Template-based',manual:'Made by hand',remix:'Remix',authored:'Authored'};
export default function Builder({initial,ai,backend,startPrompt='',onChange,onPublished,notify}:Props){
 const [state,setState]=useState<DraftResponse>(initial),[tab,setTab]=useState(initial.draft.id?'design':'make'),[prompt,setPrompt]=useState(startPrompt),[busy,setBusy]=useState(''),[error,setError]=useState(''),[baseline,setBaseline]=useState(initial.draft),[result,setResult]=useState<{changes:string[];unsupported:string[];summary:string;repaired?:boolean}|null>(null);
 const d=state.draft,spec=engineSpecs[d.engine],saved=!!d.id&&!!d.version,dirty=JSON.stringify(d)!==JSON.stringify(baseline)&&!busy;
 const update=(next:DraftResponse)=>{setState(next);setBaseline(next.draft);onChange(next);};
 const edit=(patch:Partial<Gizmo>)=>setState(s=>({...s,draft:{...s.draft,...patch}}));
 const setParam=(k:string,v:number)=>edit({params:{...d.params,[k]:v}});
 async function run(label:string,fn:()=>Promise<void>){setError('');setBusy(label);try{await fn();}catch(e){setError(e instanceof ApiError?e.message:(e as Error).message);}finally{setBusy('');}}
 // Generation is a real provider request; the previous draft is kept unless validation and saving succeed.
 const generate=()=>run(saved?'Changing it with AI…':'Building it with AI…',async()=>{
  const r=await call<DraftResponse>('/api/studio',{action:'generate',requestId:crypto.randomUUID(),prompt,base:saved?{id:d.id,version:d.version}:null});
  update(r);setResult({changes:r.changes||[],unsupported:r.unsupported||[],summary:r.summary||'',repaired:r.repaired});setPrompt('');setTab('make');notify(saved?'AI changes saved as a new draft version.':'AI draft saved. Play it, then change it or publish.');});
 const save=()=>run('Saving…',async()=>{const {id,version,creator,published,owned,authored,feedRank,counts,...gizmo}=d;void creator;void published;void owned;void authored;void feedRank;void counts;
  const r=await call<DraftResponse>('/api/social',{action:'save',id:saved?id:null,version:saved?version:0,gizmo,template:saved?undefined:d.engine});update(r);notify('Draft saved.');});
 const publish=()=>run('Publishing…',async()=>{const r=await call<DraftResponse>('/api/social',{action:'publish',id:d.id,version:d.version});update(r);notify('Published. Your gizmo is in the feed.');onPublished(r.draft);});
 const restore=(v:number)=>run('Restoring…',async()=>{const r=await call<DraftResponse>('/api/social',{action:'restore',id:d.id,restore:v,version:d.version});update(r);setResult(null);notify(`Restored version ${v} as a new draft version.`);});
 const changeEngine=(e:Engine)=>{const t=templateById(e);edit({engine:e,params:defaults(e),objects:[],controls:[],challenge:null,instructions:t.instructions,visual:{...d.visual,accent:t.visual.accent}});};
 const toggleControl=(k:string,on:boolean)=>{const s=spec.params[k];edit({controls:on?[...d.controls,{param:k,min:s.min,max:s.max}].slice(0,4):d.controls.filter(c=>c.param!==k)});};
 const latest=state.versions[0],previous=state.versions[1];
 return <><div className="builder-top"><div><span className="social-kicker">YOUR STUDIO</span><h2>{d.title}</h2><small>{kindLabel[d.provenance.kind]||''}{d.provenance.kind==='ai'&&d.provenance.model?` · ${d.provenance.provider} ${d.provenance.model}`:''}</small></div><span className="builder-draft-tag">{state.publishedVersion?`Published v${state.publishedVersion}`:'Draft'}{saved?` · v${d.version}`:' · unsaved'}</span></div>
 <div className="builder-layout"><div className="builder-preview"><GizmoCanvas key={`${d.id||'new'}-${d.version||0}-${d.engine}`} gizmo={d} active/><span>Live, playable preview{dirty?' · unsaved changes':''}</span></div>
 <div className="builder-properties"><div className="builder-tabs"><button className={tab==='make'?'active':''} onClick={()=>setTab('make')}><Sparkles size={15}/>Describe</button><button className={tab==='design'?'active':''} onClick={()=>setTab('design')}><SlidersHorizontal size={15}/>Settings</button><button className={tab==='versions'?'active':''} disabled={!saved} onClick={()=>setTab('versions')}><History size={15}/>Versions</button></div>
 {tab==='make'?<div className="social-form builder-ai">
  <p className="builder-steps"><b>Describe it</b> → <b>Play it</b> → <b>Change it</b> → <b>Publish it</b></p>
  {ai&&backend?<><label>{saved?'Change it':'Describe it'}<textarea value={prompt} maxLength={600} rows={3} onChange={e=>setPrompt(e.target.value)} placeholder={saved?'Make it Mars, add a spring launch pad and make the cat orange':'Make a planet where a cat jumps ridiculously high'}/></label>
   <button className="social-white-button" disabled={!!busy||prompt.trim().length<3} onClick={generate}><Sparkles size={15}/>{busy||(saved?'Change it with AI':'Create with AI')}</button>
   <small>Uses {ai.provider} · {ai.model}. Your idea is checked first and sent without your name, timetable or friends. Results are validated against supported engines, ranges and units before they are saved as a draft.</small></>
  :<div className="builder-ai-off" role="status"><AlertTriangle size={18}/><div><strong>AI creation isn’t configured</strong><p>{backend?'This server has no Groq key, so ideas cannot be generated.':'This server has no database or AI configured.'} You can still start from a template and change every setting by hand in Settings.</p></div></div>}
  {result&&<div className="builder-result" role="status"><strong>{d.provenance.kind==='ai'?'What changed':'Result'}</strong><ul>{result.changes.map(c=><li key={c}>{c}</li>)}</ul>{result.summary&&<p>{result.summary}</p>}{result.unsupported.length>0&&<><strong>Not built (not supported yet)</strong><ul>{result.unsupported.map(u=><li key={u}>{u}</li>)}</ul></>}{result.repaired&&<small>The first answer failed validation and was repaired once.</small>}{previous&&<button className="social-dark-button" disabled={!!busy} onClick={()=>restore(previous.version)}><Undo2 size={15}/>Undo this change</button>}</div>}
  <p className="sheet-subcopy">AI drafts stay labelled as unreviewed AI content. The physics comes from ClassPocket’s tested formulas, not from the AI’s wording.</p>
 </div>:tab==='design'?<div className="social-form">
  <label>Gizmo name<input value={d.title} maxLength={70} onChange={e=>edit({title:e.target.value})}/></label>
  <label>Caption<textarea value={d.caption} maxLength={240} onChange={e=>edit({caption:e.target.value})}/></label>
  <label>Subject<select value={d.subject} onChange={e=>edit({subject:e.target.value as Gizmo['subject']})}>{subjects.map(s=><option key={s}>{s}</option>)}</select></label>
  <label>World engine<select value={d.engine} onChange={e=>changeEngine(e.target.value as Engine)}>{engines.map(e=><option key={e} value={e}>{engineSpecs[e].name}</option>)}</select></label>
  <fieldset className="builder-params"><legend>{spec.name} settings</legend>{Object.entries(spec.params).map(([k,s])=><div key={k}><label>{s.label}<span>{d.params[k]} {s.unit}</span><input type="range" min={s.min} max={s.max} step={s.step} value={d.params[k]} onChange={e=>setParam(k,Number(e.target.value))}/></label><label className="builder-check"><input type="checkbox" checked={d.controls.some(c=>c.param===k)} onChange={e=>toggleControl(k,e.target.checked)}/>Players can adjust{d.controls.some(c=>c.param===k)?` (${controlRange(d,k).min}–${controlRange(d,k).max})`:''}</label></div>)}</fieldset>
  {spec.objects.length>0&&<fieldset className="builder-params"><legend>Objects</legend>{spec.objects.map(o=><label className="builder-check" key={o}><input type="checkbox" checked={d.objects.some(x=>x.kind===o)} onChange={e=>edit({objects:e.target.checked?[...d.objects,{kind:o}]:d.objects.filter(x=>x.kind!==o)})}/>{o}</label>)}</fieldset>}
  {d.engine==='jumper'&&<><label>Character<select value={d.visual.character} onChange={e=>edit({visual:{...d.visual,character:e.target.value as Gizmo['visual']['character']}})}>{characters.map(c=><option key={c}>{c}</option>)}</select></label>
   <label>Planet<select value={d.visual.planet} onChange={e=>{const p=e.target.value as Gizmo['visual']['planet'];edit({visual:{...d.visual,planet:p},params:p in planetGravity?{...d.params,gravity:planetGravity[p as keyof typeof planetGravity]}:d.params});}}>{planets.map(c=><option key={c}>{c}</option>)}</select></label>
   <label className="color-control">Character colour<input type="color" value={d.visual.characterColour} onChange={e=>edit({visual:{...d.visual,characterColour:e.target.value}})}/><span>{d.visual.characterColour}</span></label></>}
  {d.challenge&&<div className="builder-goal"><span>Goal: {d.challenge.label} ({d.challenge.comparator==='atLeast'?'≥':'≤'} {d.challenge.target} {spec.metrics[d.challenge.metric]?.unit})</span><button className="social-dark-button" onClick={()=>edit({challenge:null})}>Remove goal</button></div>}
  <label className="color-control">Accent color<input type="color" value={d.visual.accent} onChange={e=>edit({visual:{...d.visual,accent:e.target.value}})}/><span>{d.visual.accent}</span></label>
  <label>Simulation speed <span>{d.speed.toFixed(2)}×</span><input type="range" min=".25" max="3" step=".25" value={d.speed} onChange={e=>edit({speed:Number(e.target.value)})}/></label>
  <label>How to play<textarea value={d.instructions} maxLength={300} onChange={e=>edit({instructions:e.target.value})}/></label>
  <small>Manual editing works without AI. Values are checked against each engine’s ranges when you save.</small>
 </div>:<div className="builder-versions">{state.versions.map(v=><div key={v.version}><span><strong>Version {v.version}{v.version===latest?.version?' · current':''}</strong><small>{new Date(v.created).toLocaleString()} · {v.note||kindLabel[v.kind||'']||''}</small></span>{v.version!==latest?.version&&<button aria-label={`Restore gizmo version ${v.version}`} disabled={!!busy} onClick={()=>restore(v.version)}><RotateCcw size={17}/></button>}</div>)}{!state.versions.length&&<p>Save your first version to start a history.</p>}</div>}
 {error&&<p className="social-inline-error" role="alert">{error}</p>}
 <div className="builder-actions"><button className="social-dark-button" disabled={!!busy||!backend||(saved&&!dirty)} onClick={save}>{busy==='Saving…'?busy:saved?'Save changes':'Save draft'}</button><button className="social-white-button" disabled={!!busy||!saved||dirty||!d.title.trim()||!d.caption.trim()} title={dirty?'Save your changes first':undefined} onClick={publish}>{state.publishedVersion===d.version?'Published':'Publish gizmo'}<ArrowUpRight size={16}/></button></div>
 {!backend&&<small className="sheet-subcopy">Saving isn’t configured on this server: drafts cannot be stored.</small>}
 </div></div></>;
}

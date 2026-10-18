'use client';
import {useState} from 'react';
import {BookOpen,RotateCcw,Play,Check,Lightbulb} from 'lucide-react';
import type {Challenge} from '@/lib/study';
import {beamOutcome,chargeOutcome} from '@/lib/science';
import Courier from './Courier';

type Props={mission:Challenge;completed:boolean;onCargo:(answer:string)=>Promise<{correct:boolean;feedback:string}>};
export default function SciencePlayer(props:Props){return props.mission.game?<Experiment {...props}/>:<Courier {...props}/>;}
function Experiment({mission,completed,onCargo}:Props){
 const g=mission.game!;
 const [force,setForce]=useState(g.kind==='torque'?g.force:1),[distance,setDistance]=useState(g.kind==='torque'?g.distance:1),[electrons,setElectrons]=useState(g.kind==='atom'?g.electrons:0),[prediction,setPrediction]=useState(''),[result,setResult]=useState<{correct:boolean;feedback:string;outcome:string}|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[hint,setHint]=useState(false),[source,setSource]=useState(false);
 const learning=mission.learning!,torque=g.kind==='torque',charge=torque?0:g.protons-electrons;
 const outcome=torque?beamOutcome(g.leftForce*g.leftDistance,force*distance):chargeOutcome(charge);
 const done=completed||!!result?.correct;
 function change(fn:()=>void){fn();setPrediction('');setResult(null);setError('');}
 async function launch(){setBusy(true);setError('');try{const a=torque?{f:force,d:distance,p:prediction}:{e:electrons,p:prediction};const r=await onCargo(JSON.stringify(a));setResult({...r,outcome});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 const rotation=result&&torque?(outcome==='Balanced'?0:outcome==='Right down'?12:-12):0;
 return <div className={`science-player science-${g.kind}`}>
  <div className="science-hook"><div><span>{learning.stage==='recall'?'WAIT. REMEMBER THIS?':learning.stage==='transfer'?'NEW SITUATION. SAME SCIENCE.':'SMALL GAME. REAL SCIENCE.'}</span><span>{torque?'🪿':'👾'}</span></div><h2>{learning.hook}</h2></div>
  <div className={`science-world ${result?'science-ran':''} ${result?.correct?'science-win':''}`}>
   <div className="science-world-label"><span>{torque?'GOOSE ENGINEERING DEPARTMENT':'GOBLIN CHARGE AUDIT'}</span><strong>{result?result.correct?'SCIENCE CHECKED ✓':'EXPERIMENT COMPLETE':'YOUR MOVE'}</strong></div>
   {torque?<svg viewBox="0 60 420 220" role="img" aria-label={`Ideal beam. Left ${g.leftForce} newtons at ${g.leftDistance} metres. Right ${force} newtons at ${distance} metres. ${result?outcome:'Predict its motion.'}`}>
    <defs><linearGradient id={`beam-${mission.id}`}><stop stopColor="#b49bf5"/><stop offset="1" stopColor="#d6f7a1"/></linearGradient></defs>
    <path d="M180 245 L210 194 L240 245Z" fill="#61488a"/><ellipse cx="210" cy="249" rx="110" ry="8" fill="#0005"/>
    <g style={{transform:`rotate(${rotation}deg)`,transformOrigin:'210px 185px',transition:'transform .7s cubic-bezier(.2,.8,.3,1)'}}>
     <rect x="32" y="179" width="356" height="13" rx="6" fill={`url(#beam-${mission.id})`}/>
     {Array.from({length:9},(_,i)=><path key={i} d={`M${54+i*39} 180v12`} stroke="#3b294b" strokeWidth="2"/>)}
     <text x={210-g.leftDistance*39} y="132" textAnchor="middle" fontSize="44">🥒</text><text x={210+distance*39} y="132" textAnchor="middle" fontSize="44">🪿</text>
     <path d={`M${210-g.leftDistance*39} 141v24l-5-7m5 7 5-7M${210+distance*39} 141v24l-5-7m5 7 5-7`} stroke="#f6f0ff" strokeWidth="2" fill="none"/>
     <text x={210-g.leftDistance*39} y="86" textAnchor="middle" fill="#d3c3ef" fontSize="16">{g.leftForce} N</text><text x={210+distance*39} y="86" textAnchor="middle" fill="#d9fca5" fontSize="16">{force} N</text>
     <text x={210-g.leftDistance*19.5} y="213" textAnchor="middle" fill="#c3addc" fontSize="12">{g.leftDistance} m</text><text x={210+distance*19.5} y="213" textAnchor="middle" fill="#d9fca5" fontSize="12">{distance} m</text>
    </g><circle cx="210" cy="185" r="6" fill="#fff"/>
    <text x="210" y="269" textAnchor="middle" fill="#927dba" fontSize="10">FIXED PIVOT · DOWNWARD FORCES · BEAM WEIGHT IGNORED</text>
   </svg>:<svg viewBox="0 0 420 280" role="img" aria-label={`${g.element} model: ${g.protons} protons, ${g.neutrons} neutrons, ${electrons} electrons. ${result?`Net charge ${charge}.`:''}`}>
    <circle cx="210" cy="140" r="94" fill="none" stroke="#9179b438" strokeDasharray="3 8"/><circle cx="210" cy="140" r="56" fill="#4c2b6b" stroke="#b19ad5" strokeWidth="2"/>
    <text x="210" y="126" textAnchor="middle" fill="#fff" fontSize="18">{g.protons} p⁺</text><text x="210" y="150" textAnchor="middle" fill="#d3b6ed" fontSize="16">{g.neutrons} n⁰</text><text x="210" y="172" textAnchor="middle" fill="#b8a2d0" fontSize="10">NUCLEUS</text>
    {Array.from({length:electrons},(_,i)=>{const a=(i/Math.max(electrons,1))*Math.PI*2-Math.PI/2,x=210+Math.cos(a)*94,y=140+Math.sin(a)*94;return <g key={i}><circle cx={x} cy={y} r="10" fill="#d5f6a4"/><text x={x} y={y+4} textAnchor="middle" fill="#294416" fontSize="15">−</text></g>;})}
    <text x="210" y="267" textAnchor="middle" fill="#927dba" fontSize="10">COUNTING MODEL · DOT POSITIONS ARE NOT ELECTRON PATHS</text>
   </svg>}
   <div className="science-readout" aria-live="polite">{result?<><strong>{torque?outcome:`Charge ${charge>0?'+':''}${charge}`}</strong><span>{torque?`${g.leftForce*g.leftDistance} Nm left · ${force*distance} Nm right`:`${g.protons} positive − ${electrons} negative`}</span></>:<><strong>{torque?'Balance or tip it. You decide.':`${g.element} · target charge ${g.charge>0?'+':''}${g.charge}`}</strong><span>{torque?'Choose a setup, then predict what happens.':'Protons fix the identity. Move the electrons.'}</span></>}</div>
  </div>
  <div className="science-task"><span>THE MISSION</span><p>{mission.clue}</p></div>
  <fieldset className="science-controls" disabled={busy||done}>
   {torque?<><label>Goose force <strong>{force} N {g.lock==='force'?'· fixed':''}</strong><input aria-label="Goose force" type="range" min="1" max="6" step="1" value={force} disabled={g.lock==='force'} onChange={e=>change(()=>setForce(Number(e.target.value)))}/></label><label>Distance from pivot <strong>{distance} m {g.lock==='distance'?'· fixed':''}</strong><input aria-label="Distance from pivot" type="range" min="1" max="4" step="1" value={distance} disabled={g.lock==='distance'} onChange={e=>change(()=>setDistance(Number(e.target.value)))}/></label></>:<div className="electron-stepper"><span>Electrons <strong>{electrons}</strong></span><button aria-label="Remove electron" disabled={electrons===0} onClick={()=>change(()=>setElectrons(electrons-1))}>−</button><button aria-label="Add electron" disabled={electrons===20} onClick={()=>change(()=>setElectrons(electrons+1))}>+</button></div>}
   <legend className="sr-only">Configure your experiment</legend>
   <div className="science-prediction" role="group" aria-label="Predict the outcome"><span>BEFORE YOU RUN IT: WHAT WILL HAPPEN?</span><div>{mission.choices.map(p=><button key={p} aria-pressed={prediction===p} onClick={()=>{setPrediction(p);setResult(null);}}>{p}</button>)}</div></div>
   <button className="science-run" disabled={!prediction} onClick={launch}><Play size={16}/>{busy?'Checking…':'Run experiment'}</button>
  </fieldset>
  {done&&<div className="science-done"><Check size={16}/>Mission complete · try the rule again in the next gizmo</div>}
  {error&&<p className="science-error" role="alert">{error}</p>}
  {result&&<div className={`science-feedback ${result.correct?'correct':''}`} role="status"><strong>{result.correct?'THE JOKE WAS THE SETUP. THIS IS THE SCIENCE.':'THE EXPERIMENT HAS RECEIPTS.'}</strong><p>{result.feedback}</p>{result.correct&&<div><span>KEEP THIS BIT</span><p>{learning.cue}</p></div>}</div>}
  <div className="science-footer"><button onClick={()=>setHint(!hint)}><Lightbulb size={14}/>{hint?'Hide rule':'Need the rule?'}</button><button onClick={()=>setSource(!source)}><BookOpen size={14}/>Source p. {mission.page}</button>{!completed&&result&&<button aria-label="Reset experiment" onClick={()=>{setResult(null);setPrediction('');setForce(torque?g.force:1);setDistance(torque?g.distance:1);setElectrons(!torque?g.electrons:0);}}><RotateCcw size={14}/></button>}</div>
  {hint&&<p className="science-rule">{learning.concept}</p>}{source&&<blockquote>{mission.quote}</blockquote>}
 </div>;
}

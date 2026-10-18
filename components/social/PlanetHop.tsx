'use client';
import {useEffect,useRef,useState} from 'react';
import {RotateCcw,ArrowUp} from 'lucide-react';
import type {Gizmo} from '@/lib/gizmos';
import {hasObject} from '@/lib/gizmo-spec';
import {jumpHeight,springLaunchSpeed,flightTime} from '@/lib/physics-demo';
import './widgets.css';
const grounds:Record<string,[string,string]>={Earth:['#5e9c55','#2f5d34'],Moon:['#a7a9b3','#5d6070'],Mars:['#c8643d','#7a3420'],Jupiter:['#d9b48a','#9a6b45'],Venus:['#d9a35f','#8c5a2c'],Mercury:['#9b8f86','#5f5550'],Saturn:['#dcc58f','#9e8653'],Titan:['#c99a52','#7b5627'],Pluto:['#e3d8cc','#9b8b7d'],custom:['#7b6fd6','#3f3780'],none:['#6f7c96','#39425a']};
// Procedural characters built only from application-owned shapes.
function Character({kind,colour,x,y,squash}:{kind:string;colour:string;x:number;y:number;squash:number}){
 const t=`translate(${x} ${y}) scale(${1+squash*.15} ${1-squash*.2})`;
 if(kind==='robot')return <g transform={t}><rect x="-14" y="-34" width="28" height="24" rx="4" fill={colour}/><rect x="-9" y="-28" width="7" height="6" fill="#121520"/><rect x="2" y="-28" width="7" height="6" fill="#121520"/><line x1="0" y1="-34" x2="0" y2="-42" stroke={colour} strokeWidth="2"/><circle cx="0" cy="-44" r="3" fill="#ff7b7b"/><rect x="-11" y="-10" width="22" height="10" rx="3" fill={colour} opacity=".8"/></g>;
 if(kind==='astronaut')return <g transform={t}><circle cx="0" cy="-26" r="14" fill="#f2f4f8"/><ellipse cx="0" cy="-27" rx="9" ry="7" fill={colour}/><rect x="-11" y="-14" width="22" height="14" rx="6" fill="#f2f4f8"/></g>;
 if(kind==='goblin')return <g transform={t}><ellipse cx="0" cy="-16" rx="13" ry="16" fill={colour}/><path d="M-12 -24 L-24 -30 L-12 -18 M12 -24 L24 -30 L12 -18" fill={colour}/><circle cx="-5" cy="-20" r="2.5" fill="#fff6a8"/><circle cx="5" cy="-20" r="2.5" fill="#fff6a8"/><path d="M-5 -9 q5 4 10 0" stroke="#2a1f12" fill="none"/></g>;
 if(kind==='frog')return <g transform={t}><ellipse cx="0" cy="-12" rx="17" ry="12" fill={colour}/><circle cx="-8" cy="-24" r="6" fill={colour}/><circle cx="8" cy="-24" r="6" fill={colour}/><circle cx="-8" cy="-25" r="2.5" fill="#111"/><circle cx="8" cy="-25" r="2.5" fill="#111"/></g>;
 if(kind==='none')return <g transform={t}><circle cx="0" cy="-12" r="12" fill={colour}/></g>;
 return <g transform={t}><path d="M14 -10 q16 -4 12 -22" stroke={colour} strokeWidth="5" fill="none" strokeLinecap="round"/><ellipse cx="0" cy="-10" rx="15" ry="11" fill={colour}/><circle cx="-6" cy="-26" r="11" fill={colour}/><path d="M-15 -32 L-13 -44 L-6 -35 M3 -35 L1 -44 L-2 -34" fill={colour}/><circle cx="-10" cy="-28" r="1.8" fill="#111"/><circle cx="-2" cy="-28" r="1.8" fill="#111"/><path d="M-20 -24 h-8 M-20 -22 l-7 3 M8 -24 h8 M8 -22 l7 3" stroke="#ffffffa0" strokeWidth="1"/></g>;
}
export default function PlanetHop({gizmo:g,active=true,small=false,onMetric}:{gizmo:Gizmo;active?:boolean;small?:boolean;onMetric?:(m:Record<string,number>)=>void}){
 const P=g.params,pad=hasObject(g,'spring-pad'),[usePad,setUsePad]=useState(pad),[t,setT]=useState(-1),[best,setBest]=useState(0),[goals,setGoals]=useState(0),[note,setNote]=useState('');
 const raf=useRef(0),metricRef=useRef(onMetric);metricRef.current=onMetric;
 const speed=usePad&&pad?springLaunchSpeed(P.jumpSpeed,{springConstant:P.springConstant,compression:P.compression,mass:P.mass}):P.jumpSpeed;
 const peak=jumpHeight(speed,P.gravity),flight=flightTime(speed,P.gravity),showGoal=hasObject(g,'goal-ledge')||!!g.challenge;
 // Long flights in weak gravity play faster so each jump fits in about four seconds; the label says so.
 const playback=Math.max(1,flight/4),scaleMax=Math.max(2,P.goalHeight*1.25,peak*1.1),floor=270,top=40,pxPerM=(floor-top)/scaleMax;
 useEffect(()=>()=>cancelAnimationFrame(raf.current),[]);
 useEffect(()=>{if(!active){cancelAnimationFrame(raf.current);setT(-1);}},[active]);
 useEffect(()=>{setT(-1);setUsePad(pad);},[JSON.stringify(P),pad]);// eslint-disable-line react-hooks/exhaustive-deps
 function jump(){cancelAnimationFrame(raf.current);const started=performance.now(),reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finish=()=>{setT(-1);const reached=showGoal&&peak>=P.goalHeight-1e-9;const nextBest=Math.max(best,peak),nextGoals=goals+(reached?1:0);setBest(nextBest);setGoals(nextGoals);metricRef.current?.({maxHeight:nextBest,goals:nextGoals});setNote(`Peak ${peak.toFixed(2)} m in ${(flight/2).toFixed(2)} s.${showGoal?reached?' Goal ledge reached!':` ${(P.goalHeight-peak).toFixed(2)} m short of the ledge.`:''}`);};
  if(reduced){finish();return;}
  const step=(now:number)=>{const sim=(now-started)/1000*playback;if(sim>=flight){finish();return;}setT(sim);raf.current=requestAnimationFrame(step);};raf.current=requestAnimationFrame(step);}
 const height=t<0?0:Math.max(0,speed*t-.5*P.gravity*t*t),y=floor-height*pxPerM,[light,dark]=grounds[g.visual.planet]||grounds.none,ledgeY=floor-P.goalHeight*pxPerM;
 const ticks=Array.from({length:5},(_,i)=>scaleMax*i/4);
 return <div className={`gizmo-stage widget-stage widget-jumper ${small?'widget-small':''}`} data-engine="jumper" style={{'--widget-accent':g.visual.accent} as React.CSSProperties}>
  <div className="widget-top"><span>✳ {g.title}</span>{!small&&<button aria-label={`Restart ${g.title}`} onClick={()=>{setBest(0);setGoals(0);setNote('');setT(-1);metricRef.current?.({maxHeight:0,goals:0});}}><RotateCcw size={16}/></button>}</div>
  <div className="widget-art"><svg viewBox="0 0 400 330" role="img" aria-label={`${g.visual.character} on ${g.visual.planet==='none'?'a planet':g.visual.planet}: gravity ${P.gravity} metres per second squared, launch speed ${speed.toFixed(2)} metres per second, predicted peak ${peak.toFixed(2)} metres`}>
   <rect width="400" height="330" fill="#0b0d18"/>{Array.from({length:40},(_,i)=><circle key={i} cx={(i*97)%400} cy={(i*53)%200} r={i%3?0.8:1.4} fill="#ffffff55"/>)}
   {ticks.map(v=><g key={v}><line x1="34" x2="366" y1={floor-v*pxPerM} y2={floor-v*pxPerM} stroke="#ffffff12"/><text x="30" y={floor-v*pxPerM+3} textAnchor="end" fill="#9aa3c0" fontSize="9">{Number(v.toFixed(1))} m</text></g>)}
   {showGoal&&<g><rect x="240" y={ledgeY} width="100" height="8" rx="3" fill={g.visual.accent}/><text x="290" y={ledgeY-6} textAnchor="middle" fill="#e9e1ff" fontSize="10">GOAL {P.goalHeight} m</text></g>}
   {hasObject(g,'moon-rocks')&&<g fill={dark}><ellipse cx="80" cy={floor+2} rx="18" ry="8"/><ellipse cx="330" cy={floor+3} rx="24" ry="9"/></g>}
   <rect x="0" y={floor} width="400" height={330-floor} fill={light}/><rect x="0" y={floor+18} width="400" height="50" fill={dark} opacity=".55"/>
   {pad&&<g opacity={usePad?1:.35}><path d={`M182 ${floor} l6 -6 l6 6 l6 -6 l6 6 l6 -6 l6 6`} stroke="#e8e8f0" strokeWidth="2" fill="none"/><rect x="178" y={floor-9} width="44" height="4" rx="2" fill="#f2d478"/></g>}
   <Character kind={g.visual.character} colour={g.visual.characterColour} x={200} y={pad&&usePad?y-9:y} squash={t<0?0:Math.max(0,1-t*6)}/>
   <text x="200" y="22" textAnchor="middle" fill="#cdd3ef" fontSize="11">{g.visual.planet==='none'?'':g.visual.planet.toUpperCase()+' · '}g = {P.gravity} m/s²{playback>1?` · playback ×${playback.toFixed(1)}`:''}</text>
  </svg></div>
  {!small&&<><p className="widget-readout" role="status">v = {speed.toFixed(2)} m/s · peak h = v² ÷ 2g = {peak.toFixed(2)} m{best>0?` · best ${best.toFixed(2)} m`:''}</p><div className="widget-panel"><div className="widget-buttons"><button className="widget-primary" onClick={jump} disabled={t>=0}><ArrowUp size={15}/>Jump</button>{pad&&<button aria-pressed={usePad} onClick={()=>setUsePad(!usePad)}>{usePad?'Using spring pad':'Use spring pad'}</button>}</div>{pad&&<small>Spring pad: k = {P.springConstant} N/m, compressed {P.compression} m, adds ½kx² = {(0.5*P.springConstant*P.compression**2).toFixed(1)} J to a {P.mass} kg character.</small>}{note&&<small>{note}</small>}</div></>}
 </div>;
}

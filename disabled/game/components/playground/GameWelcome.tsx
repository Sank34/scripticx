"use client";

import {useEffect,useRef,useState,type CSSProperties} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {ArrowLeft,ArrowUpRight,Play,Settings2} from 'lucide-react';
import './game-welcome.css';

export function GameWelcome({ro,reducedMotion,onPlay,onSettings}:{ro:boolean;reducedMotion:boolean;onPlay:()=>void;onSettings:()=>void}){
  const root=useRef<HTMLElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),frame=useRef(0);
  const [leaving,setLeaving]=useState(false);
  useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);cancelAnimationFrame(frame.current);},[]);
  function reset(){cancelAnimationFrame(frame.current);if(root.current){root.current.dataset.tracking='false';root.current.style.setProperty('--look-x','0');root.current.style.setProperty('--look-y','0');}}
  function start(){if(leaving)return;setLeaving(true);const reduced=reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;timer.current=setTimeout(onPlay,reduced?0:550);}
  return <section ref={root} className={`island-welcome ${leaving?'is-departing':''}`} aria-labelledby="welcome-title" data-tracking="false" onPointerLeave={reset}
    onPointerMove={e=>{if(e.pointerType!=='mouse'||reducedMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const bounds=e.currentTarget.getBoundingClientRect();const x=Math.max(-1,Math.min(1,(e.clientX-bounds.left)/bounds.width*2-1)),y=Math.max(-1,Math.min(1,(e.clientY-bounds.top)/bounds.height*2-1));cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(()=>{if(root.current){root.current.dataset.tracking='true';root.current.style.setProperty('--look-x',String(x));root.current.style.setProperty('--look-y',String(y));}});}}>
    <div className="welcome-environment" aria-hidden="true"/>
    <div className="welcome-code" aria-hidden="true">{Array.from({length:24},(_,i)=><div key={i} style={{'--row':i} as CSSProperties}>{Array.from({length:36},(_,j)=><span key={j} style={{'--col':j} as CSSProperties}>{['{','[','(','<','> ',')',']','}'][(i*2+j)%8]}</span>)}</div>)}</div>
    <div className="welcome-code-fragments" aria-hidden="true">{['WHILE curious → explore()','IF light == 0 THEN','PRINT "Hello, island!"','[ discover · build · repeat ]','energy = energy + 1','{ a little code, a little magic }'].map((line,i)=><span key={line} style={{'--fragment':i} as CSSProperties}>{line}</span>)}</div>
    <header className="welcome-top"><Link href="/play" aria-label={ro?'Înapoi la hub':'Back to hub'}><ArrowLeft size={16}/><span>SCRIPTICX <b>/</b> PLAY</span></Link><button onClick={onSettings} disabled={leaving} aria-label={ro?'Setări':'Settings'}><Settings2 size={18}/><span>{ro?'Setări':'Settings'}</span></button></header>
    <div className="welcome-copy"><p className="welcome-overline"><span/>{ro?'O aventură prin cod':'An adventure in code'}</p><h1 id="welcome-title">{ro?'O insulă adormită.':'A sleeping island.'}<br/><em>{ro?'O minte curioasă.':'A curious mind.'}</em></h1><p className="welcome-description">{ro?'Lumina s-a stins. Curiozitatea, nu. Explorează cu Mousey și trezește insula la viață — o instrucțiune pe rând.':'The lights went out. Curiosity didn’t. Explore with Mousey and bring the island back to life — one instruction at a time.'}</p><button className="welcome-play" onClick={start} disabled={leaving}><Play size={19} fill="currentColor"/><span>{ro?'Hai să explorăm':'Let’s play'}</span><ArrowUpRight size={21}/></button><p className="welcome-note">{ro?'Explorează. Experimentează. Aprinde o idee.':'Explore. Experiment. Spark an idea.'}</p></div>
    <div className="welcome-mascot" aria-hidden="true"><div className="welcome-ground-shadow"/><div className="welcome-mouse-float"><div className="welcome-mouse-tilt"><Image src="/game/welcome/mousey-body.webp" alt="" width={1000} height={1200} priority unoptimized draggable={false}/><Image className="welcome-gaze" src="/game/welcome/mousey-gaze.webp" alt="" width={1000} height={1200} priority unoptimized draggable={false}/></div></div><span className="welcome-mascot-note">{ro?'Hmm… ce-i acolo?':'Hmm… what’s over there?'}</span></div>
  </section>;
}

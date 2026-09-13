"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Home, Settings, Gamepad2, Gift, X, Maximize, RotateCcw, Menu, Keyboard, MousePointer2, Hand, MessageCircle, BookOpen, Terminal } from 'lucide-react';
import { Kbd } from '@/components/ui/kbd';
import { useLanguage } from '@/components/LanguageProvider';
import { useAuth } from '@/hooks/useAuth';
import { GameAudio } from '@/lib/game-audio';
import { MissionEditor } from './MissionEditor';
import { fetchGameProgress, submitGameMission } from '@/lib/game-account';
import { emptyProgress, missions, getMission, type MissionId, type GameProgress, type ZoneId } from '@/lib/game-missions';
import { GameLoading } from './GameLoading';
import { GameWelcome } from './GameWelcome';
import { AdventureJournal } from './AdventureJournal';
import { StoryDialogue } from './StoryDialogue';
import { adventureObjective } from '@/lib/game-adventure';
import { defaultSettings, loadGameSettings, storeGameSettings, type GameSettings } from '@/lib/playground-settings';
import type { World, WorldDiagnostics } from './world';
import '@fontsource/amatic-sc/latin-ext-400.css';
import '@fontsource/amatic-sc/latin-400.css';
import '@fontsource/nunito/latin-ext-400.css';
import '@fontsource/nunito/latin-400.css';
import './game-ui.css';

type Panel='home'|'settings'|'controls'|'rewards'|'mission'|'journal'|'story';
export default function Playground() {
  const {locale}=useLanguage(),{user}=useAuth();const ro=locale==='ro';
  const host=useRef<HTMLDivElement>(null),root=useRef<HTMLDivElement>(null),modal=useRef<HTMLDialogElement>(null),world=useRef<World|null>(null),nearRef=useRef(false);
  const [ready,setReady]=useState(false),[error,setError]=useState(false),[near,setNear]=useState(false),[panel,setPanel]=useState<Panel|null>(null),[done,setDone]=useState(false),[attempt,setAttempt]=useState(0),[notice,setNotice]=useState('');
  const [progress,setProgress]=useState<GameProgress>(emptyProgress),[accountError,setAccountError]=useState(''),[zone,setZone]=useState<ZoneId>('meadow'),[welcome,setWelcome]=useState(true),[transition,setTransition]=useState(false);
  const [activeMission,setActiveMission]=useState<MissionId|null>(null),[storyFinished,setStoryFinished]=useState(false);
  useEffect(()=>{if(new URLSearchParams(window.location.search).get('from')==='commons')setWelcome(false);},[]);
  const [diagnostics,setDiagnostics]=useState<WorldDiagnostics|null>(null);
  useEffect(()=>{if(panel!=='settings')return;const update=()=>setDiagnostics(world.current?.diagnostics()??null);update();const timer=setInterval(update,1000);return()=>clearInterval(timer);},[panel,ready]);
  const drafts=useRef<Record<string,string>>({});
  const progressRef=useRef(progress);progressRef.current=progress;
  const travelTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>()=>{if(travelTimer.current)clearTimeout(travelTimer.current);},[]);
  const travel=useCallback(()=>{setTransition(true);world.current?.setPaused(true);travelTimer.current=setTimeout(()=>{setReady(false);const next=zone==='meadow'?'grove':'meadow';const url=new URL(window.location.href);url.searchParams.set('zone',next);window.history.replaceState(null,'',url);setZone(next);},450);},[zone]);
  useEffect(()=>{const controller=new AbortController();progressRef.current=emptyProgress;setProgress(emptyProgress);setDone(false);world.current?.setProgress([]);setAccountError('');
    const refresh=()=>fetchGameProgress(controller.signal).then(serverValue=>{if(!controller.signal.aborted){const value={completed:Array.from(new Set([...progressRef.current.completed,...serverValue.completed])),rewards:{...progressRef.current.rewards,...serverValue.rewards}};progressRef.current=value;setProgress(value);if(new URL(window.location.href).searchParams.get('zone')==='grove'&&value.completed.includes('lanterns'))setZone('grove');setDone(value.completed.includes('lanterns'));world.current?.setProgress(value.completed);setAccountError('');}}).catch(error=>{if(!controller.signal.aborted)setAccountError((ro?'Progres indisponibil: ':'Progress unavailable: ')+(error instanceof Error?error.message:'Please retry.'));});
    void refresh();window.addEventListener('focus',refresh);return()=>{controller.abort();window.removeEventListener('focus',refresh);};},[user?.id,ro]);
  const mission=getMission(activeMission??'')??(zone==='meadow'?missions[0]:progress.completed.includes('gate')?missions[2]:missions[1]);
  const [settings,setSettings]=useState<GameSettings>(defaultSettings);
  const settingsRef=useRef(settings);
  const audio=useRef<GameAudio|null>(null);
  useEffect(()=>{audio.current=new GameAudio();return()=>{audio.current?.dispose();audio.current=null;};},[]);
  function sound(kind:'key'|'click'|'success'){audio.current?.play(kind,settingsRef.current);}
  useEffect(()=>{const value=loadGameSettings();settingsRef.current=value;setSettings(value);},[]);
  useEffect(()=>{
    const controller=new AbortController();let active=true;
    setReady(false);setError(false);setNear(false);nearRef.current=false;setDone(progressRef.current.completed.includes('lanterns'));
    import('./world').then(({createWorld})=>{if(!active||!host.current)throw Error('Unmounted');return createWorld(host.current,controller.signal,value=>{if(active){nearRef.current=value;setNear(value);}},()=>{if(active){setError(true);setReady(false);}} ,zone,travel);}).then(value=>{
      if(!active){value.dispose();return;}world.current=value;value.setSettings(settingsRef.current);value.setProgress(progressRef.current.completed);setReady(true);setTransition(false);
    }).catch(()=>{if(active)setError(true);});
    return()=>{active=false;controller.abort();world.current?.dispose();world.current=null;};
  },[attempt,user?.id,zone,travel]);
  useEffect(()=>{world.current?.setPaused(panel!==null||welcome||transition);world.current?.setEditorOpen(panel==='mission');},[panel,ready,welcome,transition]);
  useEffect(()=>{world.current?.setCovered(welcome);},[welcome,ready]);
  useEffect(()=>{
    if(panel){if(!modal.current?.open)modal.current?.showModal();}
    else if(modal.current?.open)modal.current.close();
  },[panel]);
  useEffect(()=>{const blur=()=>{world.current?.setPaused(true);if(!welcome&&!transition)setPanel(p=>p??'home');};window.addEventListener('blur',blur);return()=>window.removeEventListener('blur',blur);},[welcome,transition]);
  function close(){setPanel(null);setActiveMission(null);world.current?.clearPreview();setNotice('');requestAnimationFrame(()=>host.current?.focus());}
  function change(patch:Partial<GameSettings>){const value={...settingsRef.current,...patch};settingsRef.current=value;setSettings(value);if(!value.sound||value.volume===0)audio.current?.silence();storeGameSettings(value);world.current?.setSettings(value);}
  function interact(){if(nearRef.current&&!panel&&!welcome){setActiveMission(mission.id);setStoryFinished(false);setPanel('story');world.current?.react();}}
  async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(root.current?.requestFullscreen)await root.current.requestFullscreen();else setNotice(ro?'Fullscreen nu este disponibil în acest browser.':'Fullscreen is unavailable in this browser.');}catch{setNotice(ro?'Browserul nu a permis fullscreen.':'The browser could not enter fullscreen.');}}
  const tabs=[{key:'home' as const,Icon:Home,label:ro?'Acasă':'Home'},{key:'settings' as const,Icon:Settings,label:ro?'Setări':'Settings'},{key:'controls' as const,Icon:Gamepad2,label:ro?'Controale':'Controls'},{key:'rewards' as const,Icon:Gift,label:ro?'Recompense':'Rewards'},{key:'journal' as const,Icon:BookOpen,label:ro?'Jurnal':'Journal'}];
  const title=panel==='journal'?(ro?'Jurnal de aventură':'Adventure journal'):panel==='story'?(storyFinished&&mission.id==='beacon'?(ro?'Insula luminează din nou':'The island shines again'):(ro?mission.title.ro:mission.title.en)):panel==='mission'?(ro?mission.title.ro:mission.title.en):panel==='settings'?(ro?'Fă-te comod':'Make yourself at home'):panel==='controls'?(ro?'Cum te joci':'Find your feet'):panel==='rewards'?(ro?'Micile tale victorii':'Little victories'):(ro?'Bine ai venit pe insulă':'Welcome to the island');
  return <div ref={root} className="sx-game" data-reduced-motion={settings.reducedMotion} onClickCapture={e=>{if(e.target instanceof Element && e.target.closest("button:not(:disabled),a,select,input[type=checkbox]"))sound('click');}}> 
    <div ref={host} inert={welcome} tabIndex={welcome?-1:0} role="application" aria-label={ro?'Joc 3D. WASD sau săgeți. E interacționează. Escape deschide meniul.':'3D game. WASD or arrows. E to interact. Escape opens menu.'} className="game-canvas"
      onPointerDown={()=>host.current?.focus()}
      onBlur={()=>{for(const key of ['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'])world.current?.setInput(key,false);}}
      onKeyDown={e=>{const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)){e.preventDefault();world.current?.setInput(key,true);}if(key===' '&&!e.repeat&&!welcome&&!panel){e.preventDefault();world.current?.jump();}if(key==='e'&&!e.repeat)interact();if(key==='j'&&!e.repeat&&!welcome){e.preventDefault();setPanel('journal');}if(key==='escape'&&!e.repeat)setPanel('home');}}
      onKeyUp={e=>world.current?.setInput(e.key.toLowerCase(),false)}/>
    <aside aria-hidden={welcome} className="game-objective"><span>{zone==='meadow'?'01':'02'} / {ro?mission.title.ro:mission.title.en}</span><p aria-live="polite">{adventureObjective(progress.completed,zone,ro)}</p></aside>
    <nav hidden={panel!==null||welcome} inert={welcome} className="game-toolbar" aria-label={ro?'Meniul jocului':'Game menu'}>
      {!welcome&&<button className="game-icon" aria-label={ro?'Jurnal de aventură':'Adventure journal'} onClick={()=>setPanel('journal')}><BookOpen/></button>}
      <button className="game-icon" aria-label={ro?'Setări':'Settings'} onClick={()=>setPanel('settings')}><Settings/></button>
      <button className="game-icon" aria-label={ro?'Meniu':'Menu'} onClick={()=>setPanel('home')}><Menu/></button>
    </nav>
    {!ready&&error&&<div className="game-loading"><h1>{error?(ro?'O mică pauză…':'A little hiccup…'):(ro?'Pregătim insula…':'Growing your island…')}</h1><p>{error?(ro?'Nu am putut porni scena WebGL.':'The WebGL scene could not start.'):(ro?'Mousey și robotul sunt pe drum.':'Mousey and the robot are on their way.')}</p>{error&&<button className="game-button" onClick={()=>setAttempt(v=>v+1)}>{ro?'Încearcă din nou':'Try again'}</button>}<Link href="/play/world?resume=1">{ro?'Înapoi la hub':'Back to hub'}</Link></div>}
    {ready&&!panel&&!welcome&&!transition&&<>
      {settings.touchControls&&<div className="game-dpad" aria-label="Movement controls">{[{key:'w',Icon:ArrowUp,label:'Forward'},{key:'a',Icon:ArrowLeft,label:'Left'},{key:'s',Icon:ArrowDown,label:'Backward'},{key:'d',Icon:ArrowRight,label:'Right'}].map(({key,Icon,label},i)=><button key={key} style={i===0?{gridColumn:2}:i===1?{gridColumn:1}:undefined} className="game-icon" aria-label={label} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);world.current?.setInput(key,true);}} onPointerUp={()=>world.current?.setInput(key,false)} onPointerCancel={()=>world.current?.setInput(key,false)} onLostPointerCapture={()=>world.current?.setInput(key,false)} onKeyDown={e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();world.current?.setInput(key,true);}}} onKeyUp={()=>world.current?.setInput(key,false)} onBlur={()=>world.current?.setInput(key,false)}><Icon/></button>)}</div>}
      <button className="game-interact" disabled={!near} onClick={interact}>{zone==='grove'&&progress.completed.includes('gate')?(ro?'Activează farul':'Activate beacon'):(ro?'Vorbește cu robotul':'Talk to the robot')}<kbd>E</kbd></button>
    </>}
    {welcome&&!error&&<GameWelcome ro={ro} reducedMotion={settings.reducedMotion} onSettings={()=>setPanel('settings')} onPlay={()=>{setWelcome(false);requestAnimationFrame(()=>host.current?.focus());}}/>}
    {!error&&!welcome&&<GameLoading ro={ro} leaving={ready&&!transition}/>}
    {accountError&&!welcome&&<div className="game-account-warning" role="status">{accountError}</div>}
    {notice&&!panel&&<div className="game-reward-toast" role="status">{notice}</div>}
    <dialog ref={modal} className={`game-dialog ${panel==='mission'?'game-dialog-mission':''} ${panel==='story'?'game-dialog-story':''}`} aria-labelledby="game-panel-title" onCancel={e=>{e.preventDefault();close();}} onClose={()=>{if(panel)setPanel(null);}}>
      {panel==='mission'?<header className="terminal-header"><div><Terminal size={19}/><span>MINISCRIPT+ <b>/</b> TERMINAL</span></div><button className="terminal-close" aria-label={ro?'Închide terminalul':'Close terminal'} onClick={close}><span>{ro?'Înapoi la insulă':'Back to island'}</span><X size={19}/></button></header>:<div className="game-tabs" aria-label={ro?'Secțiuni meniu':'Menu sections'}>{tabs.map(({key,Icon,label})=><button key={key} className="game-icon" aria-label={label} aria-pressed={panel===key} title={label} onClick={()=>setPanel(key)}><Icon/></button>)}<button className="game-icon game-close" aria-label={ro?'Închide':'Close'} onClick={close}><X/></button></div>}
      <div className="game-panel">
        {panel==='story'&&<Image className="story-portrait" src="/game/robot-wave.svg" width={478} height={510} alt="" unoptimized/>}
        <div className="game-art"><Image src="/game/robot-preview.png" width={1100} height={1100} sizes="(max-width: 700px) 1px, 40vw" alt="" priority={false}/><div><span>SCRIPTICX / PLAYGROUND</span><h2>{ro?'Un loc pentru curiozitate.':'A place for curiosity.'}</h2><p>{ro?'Ia-o pas cu pas.':'One little step at a time.'}</p></div></div>
        <div className="game-content"><p className="game-eyebrow">{ro?'Insula ScripticX':'ScripticX Island'}</p><h1 id="game-panel-title">{title}</h1>
          {panel==='journal'&&<AdventureJournal progress={progress} ro={ro}/>}
          {panel==='story'&&<StoryDialogue key={mission.id+String(storyFinished)} mission={mission.id} ro={ro} finished={storyFinished} replay={progress.completed.includes(mission.id)} onContinue={()=>{if(storyFinished)close();else{world.current?.preview(mission.id,null);setPanel('mission');}}} onJournal={()=>setPanel('journal')}/>}
          {panel==='home'&&<><p>{ro?'Salut! Aici înveți explorând, alături de Mousey și robot.':'Hello! This is a little world to explore with Mousey and the robot.'}</p><p>{ro?'Furtuna a întrerupt energia. Repară felinarele, poarta și farul prin cod. Jurnalul păstrează indiciile și următorul tău pas.':'The storm cut the power. Repair the lanterns, gate and beacon through code. Your journal keeps the clues and your next step.'}</p><button className="game-button game-primary" onClick={close}>{ro?'Hai să explorăm':'Let’s explore'} <ArrowRight size={18}/></button><Link className="game-link" href="/play/world?resume=1">{ro?'Înapoi la hub':'Back to hub'}</Link></>}
          {panel==='settings'&&<><p>{ro?'Reglează experiența. Setările se păstrează în acest browser.':'Tune your stay. Settings are saved in this browser.'}</p>
            <label className="game-setting"><span>{ro?'Calitate grafică':'Graphics quality'}<small>{ro?'Modul redus dezactivează umbrele.':'Low disables shadows and reduces resolution.'}</small></span><select value={settings.quality} onChange={e=>change({quality:e.target.value as GameSettings['quality']})}><option value="high">{ro?'Ridicată':'High'}</option><option value="low">{ro?'Redusă':'Low'}</option></select></label>
            <label className="game-setting"><span>{ro?'Distanța camerei':'Camera distance'}<small>{Math.round(settings.zoom*100)}%</small></span><input aria-label={ro?'Distanța camerei':'Camera distance'} type="range" min=".8" max="1.4" step=".05" value={settings.zoom} onChange={e=>change({zoom:Number(e.target.value)})}/></label>
            <label className="game-setting"><span>{ro?'Mișcare redusă':'Reduced motion'}<small>{ro?'Respectă și preferința sistemului.':'Also respects your system preference.'}</small></span><input type="checkbox" checked={settings.reducedMotion} onChange={e=>change({reducedMotion:e.target.checked})}/></label>
            <label className="game-setting"><span>{ro?'Butoane de deplasare':'Movement buttons'}</span><input type="checkbox" checked={settings.touchControls} onChange={e=>change({touchControls:e.target.checked})}/></label>
            <div className="game-actions"><button className="game-button" onClick={fullscreen}><Maximize size={17}/>Fullscreen</button><button className="game-button" disabled={!ready} onClick={()=>{world.current?.reset();close();}}><RotateCcw size={17}/>{ro?'Sunt blocat':'Unstuck'}</button></div><label className="game-setting"><span>{ro?'Efecte sonore':'Sound effects'}<small>{ro?'Taste, butoane și misiuni.':'Typing, buttons and missions.'}</small></span><input type="checkbox" checked={settings.sound} onChange={e=>change({sound:e.target.checked})}/></label><label className="game-setting"><span>{ro?'Volum':'Volume'}<small>{Math.round(settings.volume*100)}%</small></span><input aria-label={ro?'Volum':'Volume'} type="range" min="0" max="1" step=".05" value={settings.volume} onChange={e=>change({volume:Number(e.target.value)})}/></label>
          </>}
          {panel==='settings'&&diagnostics&&<p className="game-diagnostics" aria-label={ro?'Diagnostic randare':'Render diagnostics'}>{diagnostics.fps} FPS · {diagnostics.width} × {diagnostics.height}<br/>{diagnostics.drawCalls} draw calls · {diagnostics.triangles.toLocaleString()} triangles<br/><small>{ro?'Măsurat în acest browser, nu un benchmark pentru toate dispozitivele.':'Measured in this browser, not a benchmark for every device.'}</small></p>}
          {panel==='controls'&&<><p>{ro?'Tastatură, mouse sau ecran tactil — alege ce îți este comod.':'Keyboard, mouse or touch — make yourself comfortable.'}</p><dl className="game-controls">
            <div><dt><Keyboard className="game-control-icon" aria-hidden="true"/><span className="game-shortcuts"><span className="game-key-group">{['W','A','S','D'].map(key=><Kbd key={key} className="game-key">{key}</Kbd>)}</span><span className="game-key-or">/</span><span className="game-key-group">{[{Icon:ArrowUp,label:ro?'Sus':'Up'},{Icon:ArrowDown,label:ro?'Jos':'Down'},{Icon:ArrowLeft,label:ro?'Stânga':'Left'},{Icon:ArrowRight,label:ro?'Dreapta':'Right'}].map(({Icon,label})=><Kbd key={label} className="game-key" aria-label={label}><Icon aria-hidden="true"/></Kbd>)}</span></span></dt><dd>{ro?'Deplasare':'Move'}</dd></div>
            <div><dt><MousePointer2 className="game-control-icon" aria-hidden="true"/><span className="game-shortcuts"><Kbd className="game-key game-key-wide"><MousePointer2 aria-hidden="true"/>Click</Kbd><span className="game-key-or">/</span><Kbd className="game-key game-key-wide"><Hand aria-hidden="true"/>Tap</Kbd></span></dt><dd>{ro?'Mergi spre acel loc':'Walk to that spot'}</dd></div>
            <div><dt><MessageCircle className="game-control-icon" aria-hidden="true"/><Kbd className="game-key">E</Kbd></dt><dd>{ro?'Vorbește cu robotul':'Talk to the robot'}</dd></div>
            <div><dt><Menu className="game-control-icon" aria-hidden="true"/><Kbd className="game-key game-key-wide">Esc</Kbd></dt><dd>{ro?'Meniu / închide':'Menu / close'}</dd></div>
            <div><dt><ArrowUp className="game-control-icon" aria-hidden="true"/><Kbd className="game-key game-key-wide">Space</Kbd></dt><dd>{ro?'Săritură':'Jump'}</dd></div>
            <div><dt><Keyboard className="game-control-icon" aria-hidden="true"/><Kbd className="game-key game-key-wide">Shift</Kbd></dt><dd>{ro?'Sprint (ține apăsat)':'Sprint (hold)'}</dd></div>
          </dl></>}
          {panel==='rewards'&&<><p>{done?(ro?'Ai aprins cele trei felinare. Bravo!':'You lit all three lanterns. Nicely done!'):(ro?'Prima ta misiune te așteaptă lângă robot.':'Your first mission is waiting by the robot.')}</p><div className="game-progress"><span>{progress.completed.length} / 3</span>{ro?'misiuni finalizate':'missions complete'}</div><p>{ro?'Fiecare misiune verificată acordă 500 de puncte o singură dată. Prima oferă și fundalul MiniScript+.':'Each verified mission awards 500 points once. The first also unlocks the MiniScript+ background.'}</p><Link className="game-link" href="/shop">{ro?'Descoperă shop-ul':'Explore the shop'} <ArrowRight size={16}/></Link></>}
          {panel==='mission'&&<MissionEditor key={`${user?.id??'guest'}:${mission.id}`} ro={ro} mission={mission} draft={drafts.current[`${user?.id}:${mission.id}`]} onDraft={code=>{drafts.current[`${user?.id}:${mission.id}`]=code;}} onTyping={()=>sound('key')} onFrame={frame=>world.current?.preview(mission.id,frame)} onContinue={()=>{setStoryFinished(true);setPanel('story');world.current?.react();}} onComplete={async(code,signal)=>{const receipt=await submitGameMission(mission.id,code,signal);const restored=receipt.alreadyCompleted?await fetchGameProgress(signal).catch(()=>null):null;if(signal.aborted)throw Error('Cancelled');const value={completed:Array.from(new Set([...progressRef.current.completed,mission.id])),rewards:{...progressRef.current.rewards,...restored?.rewards,...(!receipt.alreadyCompleted?{[mission.id]:{points:receipt.points,productId:receipt.productId}}:{})}};progressRef.current=value;setProgress(value);world.current?.clearPreview();world.current?.setProgress(value.completed);world.current?.celebrate();setDone(value.completed.includes('lanterns'));setAccountError('');sound('success');setNotice(receipt.alreadyCompleted?(ro?'Misiune deja salvată.':'Mission already saved.'):`+${receipt.points} ${ro?'puncte':'points'}${receipt.productId?' · MiniScript+ background':''}`);return receipt.alreadyCompleted?(ro?'Misiune deja salvată. Premiul nu se acordă din nou.':'Already saved. No duplicate reward.'):(ro?`Salvat în cont! +${receipt.points} puncte${receipt.productId?' și fundalul MiniScript+':''}.`:`Saved! +${receipt.points} points${receipt.productId?' and the MiniScript+ background':''}.`);}} onLeave={()=>world.current?.clearPreview()}/>}
          {notice&&<p role="status" className="game-note">{notice}</p>}
        </div>
      </div>
    </dialog>
  </div>;
}

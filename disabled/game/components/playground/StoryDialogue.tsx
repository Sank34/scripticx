import { useState } from 'react';
import { ArrowRight, Code2, BookOpen } from 'lucide-react';
import { adventure } from '@/lib/game-adventure';
import type { MissionId } from '@/lib/game-missions';
export function StoryDialogue({mission,ro,finished,replay=false,onContinue,onJournal}:{mission:MissionId;ro:boolean;finished:boolean;replay?:boolean;onContinue():void;onJournal():void}){
  const [beat,setBeat]=useState(0),lang=ro?'ro':'en';
  const lines=finished?[adventure[mission].aftermath]:replay?[{ro:'Reparația este deja salvată! Insula păstrează energia pe care ai adus-o înapoi.',en:'This repair is already saved! The island keeps the power you restored.'},{ro:'Poți exersa din nou și urmări cum codul schimbă scena. Progresul rămâne al tău; recompensa nu se acordă încă o dată.',en:'You can practise again and watch the code change the scene. Your progress stays yours; the reward is not granted again.'}]:adventure[mission].intro;
  // A completion from another tab can shorten an open dialogue to its replay line.
  const current=Math.min(beat,lines.length-1),last=current===lines.length-1;
  return <section className="story-dialogue">
    <span className="story-speaker">{ro?'ROBOTUL · TRANSMISIE LOCALĂ':'ROBOT · LOCAL TRANSMISSION'}</span>
    <p key={current} className="story-line" aria-live="polite">{lines[current][lang]}</p>
    <div className="story-pagination" aria-label={`${current+1} / ${lines.length}`}>{lines.map((_,i)=><span key={i} data-active={i===current}/>)}</div>
    <div className="game-actions"><button className="game-button game-primary" onClick={()=>last?onContinue():setBeat(v=>v+1)}>{last?(finished?(ro?'Înapoi pe insulă':'Back to the island'):(ro?'Hai să programăm':'Let’s code')):(ro?'Continuă':'Continue')}{last&&!finished?<Code2 size={18}/>:<ArrowRight size={18}/>}</button>{finished&&<button className="game-button" onClick={onJournal}><BookOpen size={18}/>{ro?'Deschide jurnalul':'Open journal'}</button>}</div>
  </section>;
}

import { Check, LockKeyhole, Compass, Gift } from 'lucide-react';
import { adventure, journalEntries, nextAdventureMission } from '@/lib/game-adventure';
import type { GameProgress } from '@/lib/game-missions';
export function AdventureJournal({progress,ro}:{progress:GameProgress;ro:boolean}){
  const next=nextAdventureMission(progress.completed),lang=ro?'ro':'en';
  const earned=Object.values(progress.rewards).reduce((sum,reward)=>sum+reward.points,0);
  return <section className="adventure-journal">
    <p className="journal-summary"><Compass size={20}/>{next?(ro?'Următorul pas: ':'Next stop: ')+next.title[lang]:(ro?'Aventură încheiată. Insula luminează din nou.':'Adventure complete. The island shines again.')}</p>
    <ol>{journalEntries(progress).map((entry,index)=><li key={entry.id} data-complete={entry.complete} aria-current={entry.id===next?.id?'step':undefined}>
      <span className="journal-marker">{entry.complete?<Check size={17}/>:entry.available?String(index+1).padStart(2,'0'):<LockKeyhole size={15}/>}</span>
      <div><h2>{entry.title[lang]}</h2><p>{entry.complete?adventure[entry.id].aftermath[lang]:entry.available?(ro?'Disponibilă · ':'Available · ')+(entry.zone==='meadow'?(ro?'Poiană':'Meadow'):(ro?'Pădure':'Grove')):(ro?'Continuă misiunea anterioară pentru a descoperi acest loc.':'Finish the previous mission to discover this place.')}</p>
      {entry.available&&<details><summary>{entry.complete?(ro?'Ce ai descoperit':'What you discovered'):(ro?'Am nevoie de un indiciu':'I need a hint')}</summary><p>{adventure[entry.id].discovery[lang]}</p></details>}
      <small><Gift size={13}/>{entry.reward?`${entry.reward.points} ${ro?'puncte primite':'points received'}`:`500 ${ro?'puncte la finalizare':'points on completion'}`}{entry.id==='lanterns'?' + MiniScript+ background':''}</small></div>
    </li>)}</ol>
    <p className="journal-total">{ro?'Recompense confirmate în cont':'Rewards confirmed in your account'} <strong>{earned} {ro?'puncte':'points'}</strong></p>
  </section>;
}

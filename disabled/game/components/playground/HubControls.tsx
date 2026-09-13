import {ArrowUp,ArrowDown,ArrowLeft,ArrowRight,Move,MousePointer2,CarFront,Map,Menu,Footprints} from 'lucide-react';
import {Kbd,KbdGroup} from '@/components/ui/kbd';

export function HubControls({ro}:{ro:boolean}){
 return <div className="hub-controls">
  <div><Move aria-hidden="true"/><span>{ro?'Deplasare':'Move'}</span><div><KbdGroup>{['W','A','S','D'].map(k=><Kbd key={k}>{k}</Kbd>)}</KbdGroup><KbdGroup>{[{Icon:ArrowUp,name:'Up'},{Icon:ArrowDown,name:'Down'},{Icon:ArrowLeft,name:'Left'},{Icon:ArrowRight,name:'Right'}].map(({Icon,name})=><Kbd key={name} aria-label={name}><Icon/></Kbd>)}</KbdGroup></div></div>
  <div><MousePointer2 aria-hidden="true"/><span>{ro?'Mergi la locul ales':'Walk to a spot'}</span><Kbd>{ro?'Click / Atinge':'Click / Tap'}</Kbd></div>
  <div><Map aria-hidden="true"/><span>{ro?'Interacțiune lângă stație':'Interact at a station'}</span><KbdGroup><Kbd>Tab</Kbd><Kbd>E</Kbd></KbdGroup></div>
  <div><CarFront aria-hidden="true"/><span>{ro?'Urcă / coboară':'Enter / exit rover'}</span><Kbd>F</Kbd></div>
  <div><Move aria-hidden="true"/><span>{ro?'Sprint / turbo (ține apăsat)':'Sprint / boost (hold)'}</span><Kbd>Shift</Kbd></div>
  <div><Footprints aria-hidden="true"/><span>{ro?'Săritură':'Jump'}</span><Kbd>Space</Kbd></div>
  <div><Menu aria-hidden="true"/><span>{ro?'Meniu / închide':'Menu / close'}</span><Kbd>Esc</Kbd></div>
 </div>;
}

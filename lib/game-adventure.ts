import { missions, type GameProgress, type MissionId, type ZoneId } from './game-missions';
import type { MissionFrame } from './island-mission';
type Copy={ro:string;en:string};
export const adventure:Record<MissionId,{intro:Copy[];discovery:Copy;aftermath:Copy}>={
  lanterns:{intro:[{ro:'Mousey, furtuna a stins insula. Fără lumină, podul rămâne închis. Mă ajuți să aducem energia înapoi?',en:'Mousey, the storm left the island in the dark. Without light, the bridge stays closed. Will you help me bring the power back?'},{ro:'Fiecare felinar are un număr. Trimite 1, 2 și 3 folosind aceeași buclă și urmărește cum se aprind.',en:'Each lantern has a number. Send 1, 2 and 3 with the same loop, and watch them light up.'}],discovery:{ro:'O buclă repetă o instrucțiune. Limita decide dacă și ultimul felinar primește energie.',en:'A loop repeats an instruction. Its boundary decides whether the last lantern gets power too.'},aftermath:{ro:'Uite, podul s-a ridicat! Urmează poteca spre pădure. Acolo ne așteaptă poarta de energie.',en:'Look, the bridge is up! Follow the path into the grove. The energy gate is waiting there.'}},
  gate:{intro:[{ro:'Am ajuns! Poarta protejează farul când energia este prea mică. Senzorul ne spune câtă avem.',en:'We made it! This gate protects the beacon when power is too low. The sensor tells us how much we have.'},{ro:'Trei unități sunt suficiente. Trimite OPEN doar când este sigur; altfel trimite WAIT. Urmărește poarta în timpul testului.',en:'Three units are enough. Send OPEN only when it is safe; otherwise send WAIT. Watch the gate during your test.'}],discovery:{ro:'„Cel puțin 3” include și 3. O condiție bună funcționează și când citirea senzorului se schimbă.',en:'“At least 3” includes 3 itself. A good condition also works when the sensor reading changes.'},aftermath:{ro:'Poarta este sigură acum. Mergi la cristalul farului: platforma-releu are nevoie de ultimele instrucțiuni.',en:'The gate is safe now. Walk to the beacon crystal: the relay platform needs its final instructions.'}},
  beacon:{intro:[{ro:'Farul nu are încă semnal. Platforma-releu trebuie să aducă energia la stațiile 2, 4 și 6.',en:'The beacon has no signal yet. The relay platform must carry power to stations 2, 4 and 6.'},{ro:'Parcurge numerele, dar transmite doar valorile pare. Fiecare PRINT trimite platforma la stația respectivă.',en:'Go through the numbers, but transmit only the even ones. Each PRINT sends the platform to that station.'}],discovery:{ro:'MOD îți spune restul împărțirii. Cu restul 0 la împărțirea cu 2, platforma ajunge la stațiile de energie.',en:'MOD gives the remainder. A remainder of 0 when dividing by 2 takes the platform to the power stations.'},aftermath:{ro:'Semnal recepționat! Felinarele, poarta și farul funcționează din nou. Ai readus energia pe insulă, o instrucțiune pe rând.',en:'Signal received! The lanterns, gate and beacon are working again. You restored the island, one instruction at a time.'}},
};
export function nextAdventureMission(completed:MissionId[]){return missions.find(m=>!completed.includes(m.id))??null;}
export function adventureObjective(completed:MissionId[],zone:ZoneId,ro:boolean){
  const next=nextAdventureMission(completed);
  if(!next)return ro?'Insula are din nou energie. Explorează!':'The island has power again. Explore!';
  if(next.zone!==zone)return zone==='meadow'?(ro?'Treci podul către pădure.':'Cross the bridge into the grove.'):(ro?'Întoarce-te la felinarele din poiană.':'Return to the lanterns in the meadow.');
  return next.id==='beacon'?(ro?'Găsește cristalul farului.':'Find the beacon crystal.'):(ro?'Vorbește cu robotul de lângă potecă.':'Talk to the robot beside the path.');
}
export function journalEntries(progress:GameProgress){return missions.map((mission,index)=>({...mission,complete:progress.completed.includes(mission.id),available:index===0||progress.completed.includes(missions[index-1].id),reward:progress.rewards[mission.id]??null}));}
export type WorldPreview={mission:MissionId|null;lamps:number[];gateSignal:'OPEN'|'WAIT'|null;relayStep:number};
export const emptyWorldPreview=():WorldPreview=>({mission:null,lamps:[],gateSignal:null,relayStep:0});
/** Temporary visual rehearsal only. Never controls navigation or receipts. */
export function previewFrame(state:WorldPreview,id:MissionId,frame:MissionFrame|null):WorldPreview{
  if(!frame)return {...emptyWorldPreview(),mission:id};
  const next=state.mission===id?state:{...emptyWorldPreview(),mission:id};
  if(frame.output===null)return next;
  if(id==='lanterns'){const lamp=Number(frame.output);return [1,2,3].includes(lamp)?{...next,lamps:Array.from(new Set([...next.lamps,lamp]))}:next;}
  if(id==='gate')return {...next,gateSignal:frame.output==='OPEN'?'OPEN':'WAIT'};
  const station=Number(frame.output);return Number.isInteger(station)&&station>=1&&station<=6?{...next,relayStep:station}:next;
}

import { createWorld, type World } from '../../components/playground/world';
import { defaultSettings } from '../../lib/playground-settings';
import type { ZoneId } from '../../lib/game-missions';
import '@fontsource/amatic-sc/latin-400.css';
const host=document.querySelector<HTMLDivElement>('#scene')!;
let world:World|null=null,zone:ZoneId='meadow',controller=new AbortController(),low=false;
async function load(){world?.dispose();controller.abort();controller=new AbortController();document.querySelector('#status')!.textContent='Loading';world=await createWorld(host,controller.signal,()=>{},()=>{document.querySelector('#status')!.textContent='Context lost';},zone,()=>{zone=zone==='meadow'?'grove':'meadow';void load();});world.setSettings({...defaultSettings,quality:low?'low':'high'});document.querySelector('#status')!.textContent=zone;}
document.querySelector('#unlock')!.addEventListener('click',()=>world?.setProgress(['lanterns']));
document.querySelector('#gate')!.addEventListener('click',()=>world?.setProgress(['lanterns','gate']));
document.querySelector('#burst')!.addEventListener('click',()=>world?.celebrate());
document.querySelector('#quality')!.addEventListener('click',()=>{low=!low;world?.setSettings({...defaultSettings,quality:low?'low':'high'});document.querySelector('#quality')!.textContent=low?'High quality':'Low quality';});
document.querySelector('#travel')!.addEventListener('click',()=>{zone=zone==='meadow'?'grove':'meadow';void load();});
host.addEventListener('keydown',e=>world?.setInput(e.key.toLowerCase(),true));host.addEventListener('keyup',e=>world?.setInput(e.key.toLowerCase(),false));
window.addEventListener('pagehide',()=>{world?.dispose();controller.abort();});void load();

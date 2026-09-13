export type GameSettings = { quality:'low'|'high'; zoom:number; reducedMotion:boolean; touchControls:boolean; sound:boolean; volume:number };
export const defaultSettings:GameSettings={quality:'high',zoom:1,reducedMotion:false,touchControls:true,sound:true,volume:.35};
export function normalizeSettings(value:unknown):GameSettings{
  const v=(value&&typeof value==='object'?value:{}) as Partial<GameSettings>;
  return {quality:v.quality==='low'?'low':'high',zoom:typeof v.zoom==='number'&&Number.isFinite(v.zoom)?Math.max(.8,Math.min(1.4,v.zoom)):1,reducedMotion:v.reducedMotion===true,touchControls:v.touchControls!==false,sound:v.sound!==false,volume:typeof v.volume==='number'&&Number.isFinite(v.volume)?Math.max(0,Math.min(1,v.volume)):.35};
}
export function loadGameSettings():GameSettings{try{return normalizeSettings(JSON.parse(localStorage.getItem('sx-game-settings:v1')||'null'));}catch{return {...defaultSettings};}}
export function storeGameSettings(settings:GameSettings){try{localStorage.setItem('sx-game-settings:v1',JSON.stringify(normalizeSettings(settings)));}catch{/* Optional local persistence. */}}

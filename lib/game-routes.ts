/** Fullscreen game routes, not the platform's /play overview. */
export function isGameRoute(pathname:string|null){
 return pathname==='/play/world'||pathname==='/play/island';
}

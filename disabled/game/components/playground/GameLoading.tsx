export function GameLoading({ro,leaving=false}:{ro:boolean;leaving?:boolean}){
  return <div className={`game-scene-loading ${leaving?'is-leaving':''}`} role={leaving?undefined:'status'} aria-hidden={leaving} aria-label={ro?'Se încarcă scena':'Loading scene'}><div className="game-loading-runner">
    <svg viewBox="0 0 160 110" aria-hidden="true"><g fill="white" className="loading-mouse-body"><path d="M56 63 Q78 46 96 61 L104 91 Q79 101 51 89Z"/><ellipse cx="87" cy="43" rx="28" ry="23"/><circle cx="61" cy="26" r="17"/><circle cx="104" cy="24" r="16"/><path d="M73 20 L89 0 L100 23Z"/><ellipse cx="115" cy="48" rx="10" ry="7"/><path d="M53 79 Q22 63 18 84 Q17 93 32 89" fill="none" stroke="white" strokeWidth="5" strokeLinecap="round"/></g><ellipse className="loading-mouse-foot one" fill="white" cx="66" cy="96" rx="13" ry="7"/><ellipse className="loading-mouse-foot two" fill="white" cx="96" cy="96" rx="13" ry="7"/></svg>
    <span>{ro?'Se încarcă':'Loading'}<span className="loading-dots">…</span></span>
  </div></div>;
}

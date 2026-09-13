export type Point = { x: number; z: number };
export type Obstacle = Point & { r: number };
export const PLAYER_RADIUS = .3;

/** Ground-plane capsules: foliage and flat stepping stones remain passable. */
export function clearPosition(p: Point, obstacles: readonly Obstacle[], ground: (x:number,z:number)=>boolean) {
  if (!ground(p.x,p.z)) return false;
  for (let i=0;i<8;i++) {
    const a=i*Math.PI/4;
    if (!ground(p.x+Math.cos(a)*PLAYER_RADIUS,p.z+Math.sin(a)*PLAYER_RADIUS)) return false;
  }
  return obstacles.every(o=>Math.hypot(p.x-o.x,p.z-o.z)>=o.r+PLAYER_RADIUS-1e-6);
}

/** Small swept steps prevent tunnelling; tangent and axis candidates allow sliding. */
export function moveWithCollisions(start: Point, delta: Point, obstacles: readonly Obstacle[], ground:(x:number,z:number)=>boolean):Point {
  const distance=Math.hypot(delta.x,delta.z);
  if (!Number.isFinite(distance)) return {...start};
  const steps=Math.max(1,Math.ceil(distance/.06));
  let p={...start};
  for(let i=0;i<steps;i++) {
    const dx=delta.x/steps,dz=delta.z/steps;
    const next={x:p.x+dx,z:p.z+dz};
    const candidates=[next];
    for(const o of obstacles) {
      if(Math.hypot(next.x-o.x,next.z-o.z)>=o.r+PLAYER_RADIUS) continue;
      const length=Math.hypot(p.x-o.x,p.z-o.z);
      if(length<1e-6) continue;
      const nx=(p.x-o.x)/length,nz=(p.z-o.z)/length;
      const inward=Math.min(0,dx*nx+dz*nz);
      candidates.push({x:p.x+dx-nx*inward,z:p.z+dz-nz*inward});
    }
    candidates.push({x:p.x+dx,z:p.z},{x:p.x,z:p.z+dz});
    const valid=candidates.filter(c=>clearPosition(c,obstacles,ground));
    valid.sort((a,b)=>Math.hypot(a.x-next.x,a.z-next.z)-Math.hypot(b.x-next.x,b.z-next.z));
    if(valid[0]) p=valid[0];
  }
  return p;
}

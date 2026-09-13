import {describe,it,expect} from 'vitest';
import {clearPosition,moveWithCollisions} from './collisions';
import {canWalk,atExit} from '@/lib/game-navigation';

const open=()=>true;
describe('ground collisions',()=>{
  it('preserves unobstructed movement',()=>{
    const p=moveWithCollisions({x:0,z:0},{x:1,z:2},[],open);
    expect(p.x).toBeCloseTo(1);expect(p.z).toBeCloseTo(2);
  });
  it('does not tunnel through a thin obstacle on a long step',()=>{
    const obstacles=[{x:0,z:0,r:.08}];
    const p=moveWithCollisions({x:-2,z:0},{x:4,z:0},obstacles,open);
    expect(p.x).toBeLessThanOrEqual(-.38);expect(clearPosition(p,obstacles,open)).toBe(true);
  });
  it('slides tangentially instead of freezing on diagonal contact',()=>{
    const obstacles=[{x:0,z:0,r:.5}];
    const p=moveWithCollisions({x:-.81,z:0},{x:.2,z:.3},obstacles,open);
    expect(p.z).toBeGreaterThan(.2);expect(clearPosition(p,obstacles,open)).toBe(true);
  });
  it('keeps the whole player inside ground bounds and slides along walls',()=>{
    const ground=(x:number)=>x<1;
    const p=moveWithCollisions({x:.69,z:0},{x:1,z:1},[],ground);
    expect(p.x).toBeLessThan(.7);expect(p.z).toBeCloseTo(1);
  });
  it('does not squeeze between overlapping collision margins',()=>{
    const obstacles=[{x:0,z:-.35,r:.1},{x:0,z:.35,r:.1}];
    expect(moveWithCollisions({x:-1,z:0},{x:2,z:0},obstacles,open).x).toBeLessThan(0);
  });
  it('rejects destinations inside objects or outside the island',()=>{
    expect(clearPosition({x:0,z:0},[{x:0,z:0,r:.2}],open)).toBe(false);
    expect(clearPosition({x:7.1,z:0},[],(x,z)=>canWalk('meadow',false,false,x,z))).toBe(false);
  });
  it('keeps the bridge traversable when unlocked but blocks it when locked',()=>{
    for(const unlocked of [false,true]){
      const p=moveWithCollisions({x:0,z:-6},{x:0,z:-2},[],(x,z)=>canWalk('meadow',unlocked,false,x,z));
      expect(atExit('meadow',unlocked,p.x,p.z)).toBe(unlocked);
    }
  });
  it('respects the mission gate and allows passage after completion',()=>{
    for(const gate of [false,true]){
      const p=moveWithCollisions({x:0,z:-2},{x:0,z:-3},[],(x,z)=>canWalk('grove',true,gate,x,z));
      expect(p.z< -3.4).toBe(gate);
    }
  });
});

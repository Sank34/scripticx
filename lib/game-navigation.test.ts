import { describe,it,expect } from 'vitest';
import { canWalk,atExit } from './game-navigation';
describe('mission-gated navigation',()=>{
  it('blocks water and the bridge until verified unlock',()=>{expect(canWalk('meadow',false,false,0,-8)).toBe(false);expect(canWalk('meadow',true,false,0,-8)).toBe(true);expect(canWalk('meadow',true,false,3,-8)).toBe(false);});
  it('blocks the far side of the grove until the gate mission',()=>{expect(canWalk('grove',true,false,0,-5)).toBe(false);expect(canWalk('grove',true,true,0,-5)).toBe(true);expect(canWalk('grove',true,false,0,8)).toBe(true);});
  it('only travels through the appropriate exit',()=>{expect(atExit('meadow',false,0,-8)).toBe(false);expect(atExit('meadow',true,0,-8)).toBe(true);expect(atExit('grove',true,0,8)).toBe(true);expect(atExit('grove',true,4,8)).toBe(false);});
});

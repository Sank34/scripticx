import { describe, expect, it } from 'vitest';
import { clampToIsland, completesTutorial, isNearRobot } from './playground-rules';
describe('playground prototype rules',()=>{
  it('requires proximity to the robot',()=>{expect(isNearRobot(2,-2)).toBe(true);expect(isNearRobot(0,3)).toBe(false);expect(isNearRobot(NaN,0)).toBe(false);});
  it('keeps the player on the island',()=>{const p=clampToIsland(100,100);expect(Math.hypot(p.x,p.z)).toBeCloseTo(7.2);expect(clampToIsland(1,2)).toEqual({x:1,z:2});});
  it('accepts only the tutorial solution',()=>{expect(completesTutorial(3)).toBe(true);expect(completesTutorial(2)).toBe(false);});
});

import {expect,it} from 'vitest';
import {movementSpeed} from './movement-speed';
it('boosts only while moving and holding Shift, on foot and in the rover',()=>{
 expect(movementSpeed(false,true)).toBe(0);expect(movementSpeed(false,true,true)).toBe(0);
 expect(movementSpeed(true,false)).toBe(1.9);expect(movementSpeed(true,true)).toBeCloseTo(3.42);
 expect(movementSpeed(true,false,true)).toBe(5);expect(movementSpeed(true,true,true)).toBe(8.5);
 expect(movementSpeed(true,true,false,1.6)).toBeCloseTo(2.88);
});

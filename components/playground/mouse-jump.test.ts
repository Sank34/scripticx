import {expect,it} from 'vitest';
import {mouseJump,JUMP_DURATION} from './mouse-jump';
it('prepares on the ground then reaches a clear apex',()=>{expect(mouseJump(.12).height).toBe(0);expect(mouseJump(.12).crouch).toBeGreaterThan(0);expect(mouseJump(.46).height).toBeCloseTo(.48);});
it('lands and settles without sinking through the ground',()=>{for(let t=0;t<1.2;t+=.001)expect(mouseJump(t).height).toBeGreaterThanOrEqual(0);expect(mouseJump(.84).crouch).toBeGreaterThan(0);expect(mouseJump(JUMP_DURATION)).toEqual(mouseJump(-1));});
it('is continuous across phase boundaries',()=>{for(const t of [.16,.76,JUMP_DURATION]){const a=mouseJump(t-1e-7),b=mouseJump(t);for(const k of ['height','crouch','tuck','lean'] as const)expect(a[k]).toBeCloseTo(b[k],5);}});
it('respects reduced motion',()=>{expect(mouseJump(.46,true)).toEqual(mouseJump(-1));});

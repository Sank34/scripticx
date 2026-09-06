import { describe,expect,it } from 'vitest';
import { gamePixelRatio } from './game-render-quality';
describe('game render resolution',()=>{
  it('keeps Retina detail on a laptop',()=>expect(gamePixelRatio(1440,900,2,true)).toBe(2));
  it('does not upscale a 1440px image onto a large display',()=>{
    expect(gamePixelRatio(2560,1440,1,true)).toBe(1);
    expect(gamePixelRatio(3840,2160,2,true)).toBe(1);
  });
  it('caps high-density mobile and preserves low quality',()=>{
    expect(gamePixelRatio(390,844,3,true)).toBe(2);
    expect(gamePixelRatio(1440,900,2,false)).toBe(1);
  });
  it('bounds large render buffers',()=>{
    const ratio=gamePixelRatio(6000,4000,2,true);
    expect(6000*ratio).toBeLessThanOrEqual(4096);
    expect(6000*4000*ratio*ratio).toBeLessThanOrEqual(8_294_401);
  });
});

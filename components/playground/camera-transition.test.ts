import { describe,it,expect } from 'vitest';
import { editorCameraBlend } from './camera-transition';
describe('editor camera transition',()=>{
  it('moves gradually in both directions',()=>{
    const open=editorCameraBlend(0,true,1/60,false);
    expect(open).toBeGreaterThan(0);expect(open).toBeLessThan(.2);
    const close=editorCameraBlend(1,false,1/60,false);
    expect(close).toBeGreaterThan(.8);expect(close).toBeLessThan(1);
  });
  it('is frame-rate independent',()=>expect(editorCameraBlend(editorCameraBlend(0,true,.05,false),true,.05,false)).toBeCloseTo(editorCameraBlend(0,true,.1,false)));
  it('can reverse midway without snapping',()=>{const mid=editorCameraBlend(0,true,.08,false);const reversed=editorCameraBlend(mid,false,1/60,false);expect(reversed).toBeLessThan(mid);expect(reversed).toBeGreaterThan(0);});
  it('honours reduced motion and settles exactly',()=>{expect(editorCameraBlend(.3,true,.016,true)).toBe(1);expect(editorCameraBlend(.3,false,.016,true)).toBe(0);expect(editorCameraBlend(.00001,false,.016,false)).toBe(0);});
});

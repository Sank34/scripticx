import { afterEach, describe, expect, it, vi } from 'vitest';
import { readPlayProgress, savePlayProgress } from './playground-progress';
afterEach(()=>vi.unstubAllGlobals());
describe('local playground progress',()=>{
  it('isolates accounts and restores completion',()=>{const entries=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>entries.get(k),setItem:(k:string,v:string)=>entries.set(k,v)});expect(readPlayProgress('a')).toBe(false);savePlayProgress('a');expect(readPlayProgress('a')).toBe(true);expect(readPlayProgress('b')).toBe(false);expect(readPlayProgress()).toBe(false);});
  it('tolerates blocked browser storage',()=>{vi.stubGlobal('localStorage',{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}});expect(readPlayProgress()).toBe(false);expect(()=>savePlayProgress()).not.toThrow();});
});

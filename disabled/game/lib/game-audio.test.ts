import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameAudio } from './game-audio';
import { defaultSettings } from './playground-settings';

afterEach(()=>vi.unstubAllGlobals());
describe('game audio',()=>{
  it('does not create an audio context when muted',()=>{
    const ctor=vi.fn();vi.stubGlobal('AudioContext',ctor);
    const audio=new GameAudio();audio.play('key',{...defaultSettings,sound:false});audio.play('click',{...defaultSettings,volume:0});
    expect(ctor).not.toHaveBeenCalled();
  });
  it('survives browsers without audio support',()=>{
    vi.stubGlobal('AudioContext',undefined);
    expect(()=>{const audio=new GameAudio();audio.play('click',defaultSettings);audio.dispose();}).not.toThrow();
  });
  it('schedules a short envelope, stops voices and releases the context',()=>{
    const stop=vi.fn(),close=vi.fn().mockResolvedValue(undefined),start=vi.fn();
    const param={setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()};
    vi.stubGlobal('AudioContext',class {currentTime=0;state='running';destination={};close=close;createOscillator(){return {frequency:param,connect:vi.fn(),disconnect:vi.fn(),start,stop};}createGain(){return {gain:param,connect:vi.fn(),disconnect:vi.fn()};}});
    const audio=new GameAudio();audio.play('key',defaultSettings);expect(start).toHaveBeenCalledOnce();expect(stop).toHaveBeenCalledOnce();audio.dispose();expect(close).toHaveBeenCalledOnce();expect(stop).toHaveBeenCalledTimes(2);
  });
});

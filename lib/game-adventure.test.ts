import { describe,it,expect } from 'vitest';
import { adventureObjective,emptyWorldPreview,journalEntries,nextAdventureMission,previewFrame } from './game-adventure';
describe('adventure progression',()=>{
  it('links the story across zones in prerequisite order',()=>{
    expect(nextAdventureMission([])?.id).toBe('lanterns');
    expect(adventureObjective(['lanterns'],'meadow',false)).toContain('bridge');
    expect(nextAdventureMission(['lanterns','gate'])?.id).toBe('beacon');
    expect(nextAdventureMission(['lanterns','gate','beacon'])).toBeNull();
  });
  it('keeps future clues locked and uses confirmed reward receipts',()=>{
    const entries=journalEntries({completed:['lanterns'],rewards:{lanterns:{points:500,productId:'miniscript-background'}}});
    expect(entries.map(e=>e.available)).toEqual([true,true,false]);
    expect(entries[0].reward?.points).toBe(500);expect(entries[1].reward).toBeNull();
  });
  it('only changes a scene preview when the instruction produces output',()=>{
    const state=previewFrame(emptyWorldPreview(),'beacon',null);
    expect(previewFrame(state,'beacon',{line:0,output:null,lamp:null})).toBe(state);
    expect(previewFrame(state,'beacon',{line:3,output:'4',lamp:2}).relayStep).toBe(4);
    expect(previewFrame(state,'beacon',{line:3,output:'1000',lamp:null}).relayStep).toBe(0);
  });
  it('resets temporary gate and lantern state without creating progress',()=>{
    const gate=previewFrame(emptyWorldPreview(),'gate',{line:1,output:'OPEN',lamp:1});
    expect(gate.gateSignal).toBe('OPEN');expect(previewFrame(gate,'gate',null).gateSignal).toBeNull();
    expect(previewFrame(gate,'lanterns',{line:2,output:'2',lamp:1}).lamps).toEqual([2]);
    expect(gate).not.toHaveProperty('completed');
  });
});

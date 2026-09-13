import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeIslandMission, starterCode, verifyMission } from './island-mission';
import { missions } from './game-missions';
beforeEach(()=>vi.spyOn(Date,'now').mockReturnValue(0));
afterEach(()=>vi.restoreAllMocks());

describe('island mission', () => {
  it('rejects execution after the wall-clock budget without a partial success',()=>{
    vi.mocked(Date.now).mockReturnValueOnce(0).mockReturnValue(76);
    const result=executeIslandMission(starterCode.replace('<= 2','<= 3'));
    expect(result.success).toBe(false);
    expect(result.frames).toEqual([]);
    expect(result.error).toContain('time limit');
  });
  it('verifies conditions across sensor values, not only the visible example',()=>{
    expect(verifyMission(missions[1].starter,'gate')).toBe(false);
    expect(verifyMission(missions[1].starter.replace('> 3','>= 3'),'gate')).toBe(true);
    expect(verifyMission('IF energy >= 0 THEN\nPRINT "OPEN"\nELSE\nPRINT "WAIT"\nEND','gate')).toBe(false);
  });
  it('verifies combined loops and conditions with different limits',()=>{
    expect(verifyMission(missions[2].starter,'beacon')).toBe(false);
    expect(verifyMission(missions[2].starter.replace('== 1','== 0'),'beacon')).toBe(true);
    expect(verifyMission('limit = 6\n'+missions[2].starter.replace('== 1','== 0'),'beacon')).toBe(false);
  });
  it('rejects input replacement, reserved identifiers and deep expressions',()=>{
    for(const code of ['energy = 3','__proto__ = 1','x = '+ '('.repeat(13)+'1'+')'.repeat(13)])expect(executeIslandMission(code,'gate').error).toBeTruthy();
  });
  it('requires fixing the starter and synchronizes PRINT lines with lanterns', () => {
    expect(executeIslandMission(starterCode).success).toBe(false);
    const result = executeIslandMission(starterCode.replace('<= 2', '<= 3'));
    expect(result.success).toBe(true);
    expect(result.frames.filter(f => f.lamp !== null)).toEqual([1,2,3].map(lamp => ({line:2,output:String(lamp),lamp})));
  });
  it('rejects hardcoded answers without an executed loop', () => {
    expect(executeIslandMission('PRINT 1\nPRINT 2\nPRINT 3').success).toBe(false);
  });
  it('rejects incorrect ordering and extra outputs', () => {
    expect(executeIslandMission(starterCode.replace('<= 2','<= 4')).success).toBe(false);
    expect(executeIslandMission(starterCode.replace('PRINT lamp','PRINT 3')).success).toBe(false);
  });
  it('bounds endless loops without returning a partial successful trace', () => {
    const result=executeIslandMission('WHILE 1 == 1\nPRINT 1\nEND');
    expect(result.error).toContain('160'); expect(result.frames).toEqual([]);
  });
  it('handles invalid code, input, oversized sources and output', () => {
    for(const code of ['NOPE','INPUT X','x'.repeat(4001),'PRINT "'+ 'a'.repeat(201)+'"']) expect(executeIslandMission(code).error).toBeTruthy();
  });
  it('isolates consecutive executions', () => {
    executeIslandMission('lamp = 10');
    expect(executeIslandMission('PRINT lamp').error).toBeTruthy();
  });
  it('bounds growing string variables',()=>{
    expect(executeIslandMission('s = "abc"\nWHILE 1 == 1\ns = s + s\nEND').error).toContain('too large');
  });
});

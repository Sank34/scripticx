import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),requireUser:vi.fn(),rate:vi.fn()}));
vi.mock('@/lib/supabaseServer',()=>({createAdminSupabase:()=>({rpc:mocks.rpc})}));
vi.mock('@/lib/server/requestSecurity',()=>({
  HttpError:class extends Error{constructor(public status:number,message:string){super(message);}},
  requireUser:mocks.requireUser,enforceRateLimit:mocks.rate,jsonObject:(v:unknown)=>v,
  readJsonBody:(r:Request)=>r.json(),stringField:(v:unknown)=>{if(typeof v!=='string')throw Error('Invalid string');return v;},
}));
import { POST } from './route';
import { missions } from '@/lib/game-missions';
const request=(body:unknown)=>new Request('http://localhost/api/play/progress',{method:'POST',body:JSON.stringify(body)});
// Routing assertions must not depend on host scheduling during the full suite.
// The interpreter deadline is exercised separately with an advancing clock.
beforeEach(()=>{vi.clearAllMocks();vi.spyOn(Date,'now').mockReturnValue(0);mocks.requireUser.mockResolvedValue({user:{id:'verified-user'}});mocks.rpc.mockResolvedValue({data:{points:500},error:null});});
afterEach(()=>vi.restoreAllMocks());
describe('game server verification',()=>{
  it('never trusts a client success flag or supplied reward',async()=>{
    const response=await POST(request({missionId:'lanterns',code:'PRINT 3',success:true,points:9999}));
    expect(response.status).toBe(422);expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('uses authenticated identity and only sends a solution hash to the atomic grant',async()=>{
    const response=await POST(request({missionId:'lanterns',code:missions[0].starter.replace('<= 2','<= 3'),userId:'victim',points:9000,productId:'other'}));
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('complete_game_mission',{p_user_id:'verified-user',p_mission_id:'lanterns',p_solution_hash:expect.stringMatching(/^[a-f0-9]{64}$/)});
  });
  it('rejects a condition that only passes the visible example',async()=>{
    const response=await POST(request({missionId:'gate',code:'IF energy >= 0 THEN\nPRINT "OPEN"\nELSE\nPRINT "WAIT"\nEND'}));
    expect(response.status).toBe(422);expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('preserves the same database idempotency identity on retry',async()=>{
    const body={missionId:'lanterns',code:missions[0].starter.replace('<= 2','<= 3')};
    await Promise.all([POST(request(body)),POST(request(body))]);
    expect(mocks.rpc.mock.calls[0]).toEqual(mocks.rpc.mock.calls[1]);
  });
});

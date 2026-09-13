import { createHash } from 'node:crypto';
import { createAdminSupabase } from '@/lib/supabaseServer';
import { enforceRateLimit, HttpError, jsonObject, readJsonBody, requireUser, stringField } from '@/lib/server/requestSecurity';
import { getMission } from '@/lib/game-missions';
import { verifyMission } from '@/lib/island-mission';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};
function failure(error:unknown){
  if(error instanceof HttpError)return Response.json({error:error.message},{status:error.status,headers});
  console.error('Game progress service:',error);
  return Response.json({error:'Account progress is unavailable. No reward has been confirmed. Please retry.'},{status:503,headers});
}
export async function GET(request:Request){
  try{
    const {user}=await requireUser(request);
    const admin=createAdminSupabase();
    const {data,error}=await admin.from('game_mission_completions').select('mission_id,points_awarded,product_id').eq('user_id',user.id);
    if(error)throw error;
    return Response.json({completed:(data??[]).map(r=>r.mission_id),rewards:Object.fromEntries((data??[]).map(r=>[r.mission_id,{points:r.points_awarded,productId:r.product_id}]))},{headers});
  }catch(error){return failure(error);}
}
export async function POST(request:Request){
  try{
    const {user}=await requireUser(request);
    await enforceRateLimit({key:user.id,action:'game_mission',limit:12,windowSeconds:60});
    const body=jsonObject(await readJsonBody(request,10000));
    const id=stringField(body.missionId,{min:1,max:30});const mission=getMission(id);
    if(!mission)throw new HttpError(400,'Unknown mission.');
    const code=stringField(body.code,{min:1,max:2000,trim:false});
    if(!verifyMission(code,mission.id))throw new HttpError(422,'The solution did not pass all sensor tests. Check your conditions and loop limits.');
    const {data,error}=await createAdminSupabase().rpc('complete_game_mission',{p_user_id:user.id,p_mission_id:mission.id,p_solution_hash:createHash('sha256').update(code).digest('hex')});
    if(error)throw error;
    return Response.json(data,{headers});
  }catch(error){return failure(error);}
}

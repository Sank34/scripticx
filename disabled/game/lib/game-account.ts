import { getSessionWithTimeout } from './auth-client';
import type { GameProgress, MissionId } from './game-missions';
async function request(body?:{missionId:MissionId;code:string},signal?:AbortSignal){
  const {data:{session}}=await getSessionWithTimeout(5000);
  if(!session)throw Error('Sign in to save progress and receive rewards.');
  const response=await fetch('/api/play/progress',{method:body?'POST':'GET',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000),cache:'no-store'});
  const data=await response.json();if(!response.ok)throw Error(data.error||'Account progress is unavailable.');return data;
}
export async function fetchGameProgress(signal?:AbortSignal):Promise<GameProgress>{return request(undefined,signal);}
export async function submitGameMission(missionId:MissionId,code:string,signal?:AbortSignal):Promise<{alreadyCompleted:boolean;points:number;productId:string|null;balance:number}>{return request({missionId,code},signal);}

import { executeIslandMission } from '@/lib/island-mission';

self.onmessage = (event: MessageEvent<{code:string;id:import('@/lib/game-missions').MissionId}>) => {
  self.postMessage(executeIslandMission(event.data.code,event.data.id));
};

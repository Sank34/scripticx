"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getRoadmapConfigData,
  readRemoteRoadmapConfig,
  readRoadmapConfig,
  roadmapConfigEvent,
  writeRoadmapConfig,
} from "@/lib/roadmap-config";

const roadmapQueryKey = ["roadmap", "config"] as const;

export function useRoadmapConfig() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: roadmapQueryKey,
    queryFn: async () => {
      try {
        const remoteConfig = await readRemoteRoadmapConfig();
        if (remoteConfig) {
          writeRoadmapConfig(remoteConfig);
          return getRoadmapConfigData(remoteConfig);
        }
      } catch (error) {
        console.error("Could not load the remote roadmap configuration:", error);
        // The locally saved roadmap remains available while offline.
      }

      return getRoadmapConfigData(readRoadmapConfig());
    },
    initialData: () => getRoadmapConfigData(readRoadmapConfig()),
    initialDataUpdatedAt: 0,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const syncRoadmap = () => {
      queryClient.setQueryData(
        roadmapQueryKey,
        getRoadmapConfigData(readRoadmapConfig())
      );
    };

    window.addEventListener(roadmapConfigEvent, syncRoadmap);
    return () => window.removeEventListener(roadmapConfigEvent, syncRoadmap);
  }, [queryClient]);

  return query.data;
}

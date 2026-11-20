"use client";

import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getRoadmapConfigData,
  readRemoteRoadmapConfig,
  readRoadmapConfig,
  roadmapConfigEvent,
  writeRoadmapConfig,
} from "@/lib/roadmap-config";

export const roadmapQueryKey = ["roadmap", "config", "database-v1"] as const;

export function useRoadmapConfig({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: roadmapQueryKey,
    enabled,
    queryFn: async () => {
      const remoteConfig = await readRemoteRoadmapConfig();
      if (remoteConfig) writeRoadmapConfig(remoteConfig);
      return getRoadmapConfigData(remoteConfig);
    },
    initialData: () => {
      const cached = readRoadmapConfig();
      return cached ? getRoadmapConfigData(cached) : undefined;
    },
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

  const data = useMemo(() => getRoadmapConfigData(query.data), [query.data]);
  return { ...data, isLoading: query.isLoading, isError: query.isError, refetch: query.refetch };
}

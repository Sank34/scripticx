"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import {
  learningPathEnrollmentEvent,
  readLearningPathEnrollments,
} from "@/lib/learning-paths";

export function learningPathEnrollmentsQueryKey(userId?: string | null) {
  return ["roadmap", "path-enrollments", userId ?? "anonymous"] as const;
}

export function useLearningPaths() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = learningPathEnrollmentsQueryKey(user?.id);
  const query = useQuery({
    queryKey,
    queryFn: () => readLearningPathEnrollments(user!.id),
    enabled: Boolean(user) && !loading,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({
        queryKey: learningPathEnrollmentsQueryKey(user?.id),
      });
    };

    window.addEventListener(learningPathEnrollmentEvent, refresh);
    return () =>
      window.removeEventListener(learningPathEnrollmentEvent, refresh);
  }, [queryClient, user?.id]);

  return {
    enrollments: query.data ?? [],
    isLoading: loading || query.isPending,
    error: query.error,
    user,
  };
}

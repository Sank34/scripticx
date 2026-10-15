"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

export type ProblemAuthor = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

export function useProblemAuthors(authorIds: Array<string | null | undefined>) {
  const { user } = useAuth();
  const ids = [...new Set(authorIds.filter((id): id is string => Boolean(id)))].sort();

  return useQuery({
    queryKey: ["problem-authors", user?.id ?? "guest", ids],
    queryFn: async () => {
      if (!ids.length) return {} as Record<string, ProblemAuthor>;
      const authors: Record<string, ProblemAuthor> = {};
      // Bound requests for large catalogs without issuing one query per problem.
      for (let offset = 0; offset < ids.length; offset += 100) {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", ids.slice(offset, offset + 100));
        if (error) throw error;
        for (const author of data ?? []) authors[author.id] = author;
      }
      return authors;
    },
    enabled: ids.length > 0,
    staleTime: 60_000,
  });
}

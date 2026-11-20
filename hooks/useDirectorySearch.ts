"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { searchProfiles, searchPublicRepositories, type SearchScope } from "@/lib/directory-search";

export function useDirectorySearch(query: string, scope: SearchScope, pageSize: number, enabled = true) {
  const normalized = query.trim().slice(0, 150);
  const [term, setTerm] = useState(normalized);

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(normalized), 250);
    return () => window.clearTimeout(timer);
  }, [normalized]);

  const active = enabled && Boolean(term) && term === normalized;

  const users = useInfiniteQuery({
    queryKey: ["directory-search", "users", term, pageSize],
    queryFn: ({ pageParam, signal }) => searchProfiles(term, pageParam, pageSize + 1, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _, offset) => lastPage.length > pageSize ? offset + pageSize : undefined,
    enabled: active && scope !== "repositories",
  });
  const repositories = useInfiniteQuery({
    queryKey: ["directory-search", "repositories", term, pageSize],
    queryFn: ({ pageParam, signal }) => searchPublicRepositories(term, pageParam, pageSize + 1, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _, offset) => lastPage.length > pageSize ? offset + pageSize : undefined,
    enabled: active && scope !== "users",
  });

  return {
    waiting: normalized !== term,
    users,
    repositories,
    userResults: active ? users.data?.pages.flatMap((page) => page.slice(0, pageSize)) ?? [] : [],
    repositoryResults: active ? repositories.data?.pages.flatMap((page) => page.slice(0, pageSize)) ?? [] : [],
  };
}

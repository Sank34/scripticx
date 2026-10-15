"use client";

import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { UserAvatar } from "@/components/user/UserAvatar";
import type { ProblemAuthor as Author } from "@/hooks/useProblemAuthors";
import { cn } from "@/lib/utils";

type ProblemAuthorProps = {
  authorId?: string | null;
  author?: Author | null;
  isLoading?: boolean;
  linkProfile?: boolean;
  className?: string;
};

export function ProblemAuthor({ authorId, author, isLoading, linkProfile = true, className }: ProblemAuthorProps) {
  const { locale } = useLanguage();
  if (!authorId) return null;

  const username = author?.username?.trim();
  const name = username || (isLoading
    ? (locale === "ro" ? "Se încarcă autorul…" : "Loading author…")
    : (locale === "ro" ? "Autor indisponibil" : "Author unavailable"));
  const identity = (
    <>
      <UserAvatar avatarUrl={author?.avatar_url} username={username} className="size-6 shrink-0" />
      <span className="min-w-0 break-words font-medium text-foreground">{name}</span>
    </>
  );

  return (
    <span className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground", className)}>
      <span>Authored by</span>
      {linkProfile && username ? (
        <Link href={`/u/${encodeURIComponent(username)}`} className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {identity}
        </Link>
      ) : (
        <span className="inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-2 gap-y-1">{identity}</span>
      )}
    </span>
  );
}

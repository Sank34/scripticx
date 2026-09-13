"use client";

import { Fragment } from "react";
import Link from "next/link";

const mentionPattern = /(^|[^\w@])@([a-zA-Z0-9_-]+)/gm;

type MentionTextProps = {
  className?: string;
  content: string;
  onMentionOpen?: (username: string) => void;
};

export function MentionText({
  className,
  content,
  onMentionOpen,
}: MentionTextProps) {
  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of content.matchAll(mentionPattern)) {
    const index = match.index ?? 0;
    const prefix = match[1];
    const username = match[2];
    const mentionStart = index + prefix.length;

    if (mentionStart > cursor) {
      parts.push(content.slice(cursor, mentionStart));
    }

    const mentionClassName =
      "font-semibold text-foreground underline-offset-2 transition-colors hover:text-muted-foreground hover:underline";

    parts.push(
      onMentionOpen ? (
        <button
          key={`${index}-${username}`}
          type="button"
          className={mentionClassName}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onMentionOpen(username);
          }}
        >
          @{username}
        </button>
      ) : (
        <Link
          key={`${index}-${username}`}
          href={`/u/${encodeURIComponent(username)}`}
          className={mentionClassName}
        >
          @{username}
        </Link>
      )
    );

    cursor = mentionStart + username.length + 1;
  }

  if (cursor < content.length) {
    parts.push(content.slice(cursor));
  }

  return (
    <p className={className}>
      {parts.map((part, index) => (
        <Fragment key={index}>{part}</Fragment>
      ))}
    </p>
  );
}

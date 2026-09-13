const mentionPattern = /(^|[^\w@])@([a-zA-Z0-9_-]+)/gm;

export function moveMentionSelection(
  index: number,
  delta: number,
  count: number
) {
  if (count <= 0) return 0;
  return (((index + delta) % count) + count) % count;
}

export function clampMentionSelection(index: number, count: number) {
  if (count <= 0) return 0;
  return Math.min(Math.max(index, 0), count - 1);
}

export function extractMentionUsernames(content: string) {
  return [
    ...new Set(
      Array.from(content.matchAll(mentionPattern), (match) =>
        match[2].toLowerCase()
      )
    ),
  ];
}

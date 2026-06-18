const mentionPattern = /(^|[^\w@])@([a-zA-Z0-9_-]+)/gm;

export function extractMentionUsernames(content: string) {
  return [
    ...new Set(
      Array.from(content.matchAll(mentionPattern), (match) =>
        match[2].toLowerCase()
      )
    ),
  ];
}

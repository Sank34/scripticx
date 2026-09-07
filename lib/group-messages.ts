export type GroupMessageToken =
  | { type: "text"; value: string }
  | { type: "live-room"; roomId: string; value: string }
  | { type: "mention"; username: string; value: string }
  | { type: "sticker"; token: string; value: string };

const groupMessagePattern =
  /(^|[^\w@])@([a-zA-Z0-9_-]+)|(\/(?:editor\/)?live\/[a-f0-9-]+)|(:sticker-[a-f0-9-]+:)/gi;

export function getInlineStickerToken(sticker: { id: string }) {
  return `:sticker-${sticker.id}:`;
}

export function tokenizeGroupMessage(content: string): GroupMessageToken[] {
  const tokens: GroupMessageToken[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(groupMessagePattern)) {
    const [matched, mentionPrefix, username, liveRoom, sticker] = match;
    const matchIndex = match.index ?? 0;
    const start = username
      ? matchIndex + (mentionPrefix?.length ?? 0)
      : matchIndex;

    if (start > lastIndex) {
      tokens.push({ type: "text", value: content.slice(lastIndex, start) });
    }

    if (username) {
      tokens.push({ type: "mention", username, value: `@${username}` });
    } else if (liveRoom) {
      tokens.push({
        type: "live-room",
        roomId: liveRoom.split("/").filter(Boolean).at(-1) || "",
        value: liveRoom,
      });
    } else {
      tokens.push({
        type: "sticker",
        token: sticker.toLowerCase(),
        value: sticker,
      });
    }

    lastIndex = matchIndex + matched.length;
  }

  if (lastIndex < content.length) {
    tokens.push({ type: "text", value: content.slice(lastIndex) });
  }

  return tokens;
}

export function isStickerOnlyMessage(content: string) {
  const tokens = tokenizeGroupMessage(content.trim());
  return tokens.length === 1 && tokens[0].type === "sticker";
}

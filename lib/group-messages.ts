export type GroupMessageToken =
  | { type: "text"; value: string }
  | { type: "live-room"; roomId: string; value: string }
  | { type: "mention"; username: string; value: string }
  | { type: "sticker"; token: string; value: string };

const groupMessagePattern =
  /(^|[^\w@])@([a-zA-Z0-9_-]+)|(\/(?:editor\/)?live\/[a-f0-9-]+)|(:[a-z0-9][a-z0-9_-]{0,63}:)/gi;

export function emojiShortcode(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9_-]+/g, "_").replace(/^[_-]+|[_-]+$/g, "").slice(0, 32);
}

export const GROUP_EMOJI_SHORTCODES: Record<string, string> = {
  smile: "😃", grinning: "😀", laugh: "😄", joy: "😂", rofl: "🤣", blush: "😊",
  heart: "❤️", heart_eyes: "😍", sunglasses: "😎", thinking: "🤔", sob: "😭",
  cry: "😢", fire: "🔥", tada: "🎉", clap: "👏", thumbsup: "👍", thumbsdown: "👎",
  wave: "👋", rocket: "🚀", eyes: "👀", check: "✅", white_check_mark: "✅",
  star: "⭐", sparkles: "✨", pray: "🙏", muscle: "💪",100: "💯", party: "🥳",
};

export function getInlineStickerToken(sticker: { id: string; name?: string }) {
  const name = sticker.name ? emojiShortcode(sticker.name) : "";
  if (name) return `:${name}:`;
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

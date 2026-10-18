export type LiveEditorSelection = {
  fileId: string;
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  positionLineNumber: number;
  positionColumn: number;
};
export type LiveEditorPeer = { userId: string; username: string; selection: LiveEditorSelection | null };

export function parseLiveEditorSelection(value: unknown): LiveEditorSelection | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.fileId !== "string" || !data.fileId || data.fileId.length > 200) return null;
  const keys = ["startLineNumber", "startColumn", "endLineNumber", "endColumn", "positionLineNumber", "positionColumn"] as const;
  if (keys.some(key => !Number.isInteger(data[key]) || Number(data[key]) < 1 || Number(data[key]) > 1_000_000)) return null;
  const result = { fileId: data.fileId } as LiveEditorSelection;
  for (const key of keys) result[key] = data[key] as number;
  return result;
}

export function getLiveEditorPeers(state: Record<string, unknown[]>, ownId: string) {
  return Object.entries(state).filter(([id]) => id !== ownId).slice(0, 50).map(([userId, entries]): LiveEditorPeer => {
    const entry = entries.at(-1) as Record<string, unknown> | undefined;
    return { userId, username: typeof entry?.username === "string" ? entry.username.slice(0, 48) : "User", selection: parseLiveEditorSelection(entry?.selection) };
  });
}

export function liveCursorColorIndex(userId: string) {
  let hash = 0;
  for (const char of userId) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % 6;
}

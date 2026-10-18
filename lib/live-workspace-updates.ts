import type { LiveWorkspaceDocument } from "./editor-live-workspace";

export type LiveFileUpdate = { id: string; path: string; content: string };

export function getLiveFileUpdates(previous: LiveWorkspaceDocument, next: LiveWorkspaceDocument): LiveFileUpdate[] | null {
  if (previous.title !== next.title || previous.description !== next.description ||
    JSON.stringify(previous.project) !== JSON.stringify(next.project) ||
    JSON.stringify(previous.directories) !== JSON.stringify(next.directories) ||
    previous.files.length !== next.files.length) return null;
  const updates: LiveFileUpdate[] = [];
  for (let index = 0; index < next.files.length; index++) {
    const before = previous.files[index];
    const after = next.files[index];
    if (before.id !== after.id || before.path !== after.path || before.language !== after.language || before.name !== after.name) return null;
    if (before.content !== after.content) updates.push({ id: after.id, path: after.path, content: after.content });
  }
  return updates;
}

export function applyLiveFileUpdates(document: LiveWorkspaceDocument, value: unknown): LiveWorkspaceDocument | null {
  if (!Array.isArray(value) || !value.length || value.length > document.files.length) return null;
  const updates = new Map<string, string>();
  for (const update of value) {
    if (!update || typeof update.id !== "string" || typeof update.path !== "string" || typeof update.content !== "string" ||
      updates.has(update.id) || !document.files.some(file => file.id === update.id && file.path === update.path)) return null;
    updates.set(update.id, update.content);
  }
  return { ...document, files: document.files.map(file => updates.has(file.id) ? { ...file, content: updates.get(file.id)! } : file) };
}

import { normalizeProjectEntries, type ProjectDirectory, type ProjectFile } from "@/lib/editor-project";

export const EDITOR_ACTIVITY_VIEWS = ["explorer", "search", "run", "projects", "live", "source-control", "settings"] as const;
export type EditorActivityView = (typeof EDITOR_ACTIVITY_VIEWS)[number];
const BOTTOM_PANELS = ["console", "terminal", "debugger", "analysis", "visual"];

export type EditorSessionDraft = {
  files: ProjectFile[];
  directories: ProjectDirectory[];
  title: string;
  description: string;
  savedId: string | null;
  dirty: boolean;
  projectIsPublic: boolean;
  activeFileId: string | null;
  openFileIds: string[];
  projectSearch: string;
  projectLibrarySearch: string;
  output: string[];
  activityView: EditorActivityView;
  activePanel: string;
};

const memoryDrafts = new Map<string, EditorSessionDraft>();
export const editorSessionDraftKey = (userId: string) => `scripticx-editor-draft-v1:${userId}`;

export function parseEditorSessionDraft(raw: string | null): EditorSessionDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || !Array.isArray(value.files) || !value.files.length ||
      value.files.some((file: ProjectFile) => !file || typeof file.id !== "string" || typeof file.path !== "string" || typeof file.content !== "string") ||
      typeof value.title !== "string" || typeof value.description !== "string") return null;
    const project = normalizeProjectEntries([...value.files, ...(Array.isArray(value.directories) ? value.directories : [])], "");
    const ids = new Set(project.files.map(file => file.id));
    const activeFileId = ids.has(value.activeFileId) ? value.activeFileId : project.files[0].id;
    const openFileIds = Array.isArray(value.openFileIds)
      ? [...new Set(value.openFileIds.filter((id: unknown): id is string => typeof id === "string" && ids.has(id)))] as string[]
      : [activeFileId];
    if (!openFileIds.includes(activeFileId)) openFileIds.push(activeFileId);
    return {
      ...project, activeFileId, openFileIds,
      title: value.title,
      description: value.description,
      savedId: typeof value.savedId === "string" ? value.savedId : null,
      dirty: value.dirty === true,
      projectIsPublic: value.projectIsPublic !== false,
      projectSearch: typeof value.projectSearch === "string" ? value.projectSearch : "",
      projectLibrarySearch: typeof value.projectLibrarySearch === "string" ? value.projectLibrarySearch : "",
      output: Array.isArray(value.output) ? value.output.filter((line: unknown) => typeof line === "string").slice(-400) : [],
      activityView: EDITOR_ACTIVITY_VIEWS.includes(value.activityView) ? value.activityView : "explorer",
      activePanel: BOTTOM_PANELS.includes(value.activePanel) ? value.activePanel : "console",
    };
  } catch {
    return null;
  }
}

export function readEditorSessionDraft(userId: string): EditorSessionDraft | null {
  const key = editorSessionDraftKey(userId);
  if (memoryDrafts.has(key)) return memoryDrafts.get(key)!;
  try { return parseEditorSessionDraft(window.sessionStorage.getItem(key)); }
  catch { return null; }
}

export function writeEditorSessionDraft(userId: string, draft: EditorSessionDraft) {
  const key = editorSessionDraftKey(userId);
  memoryDrafts.set(key, draft);
  try { window.sessionStorage.setItem(key, JSON.stringify(draft)); }
  catch { /* Keep the in-memory draft when browser storage is unavailable or full. */ }
}

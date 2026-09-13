import { supabase } from "@/lib/supabase";
import {
  DEFAULT_WHITEBOARD_ID,
  createWorkspaceStorageRepository,
  getStudentWorkspaceStorageKey,
  getActiveWhiteboardId,
  getNote,
  getWhiteboardDocument,
  hasPristineWelcomeNotePayload,
  hydrateWorkspaceCloudDocuments,
  isPristineLegacyWelcomeNote,
  type WorkspaceNote,
  type WorkspaceStorageEventDetail,
  type WorkspaceWhiteboardDocument,
} from "@/lib/workspace-storage";

const CLOUD_STATE_VERSION = 1 as const;
const CLOUD_STATE_PREFIX = "scripticx:student-workspace:cloud:v1";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type WorkspaceEntityKind = "note" | "whiteboard";

type WorkspaceCloudState = {
  version: typeof CLOUD_STATE_VERSION;
  workspaceId: string | null;
  knownNoteIds: string[];
  knownWhiteboardIds: string[];
  noteAliases: Record<string, string>;
  whiteboardAliases: Record<string, string>;
  deletedNotes: Record<string, string>;
  deletedWhiteboards: Record<string, string>;
  lastSyncedAt: string | null;
};

type WorkspaceNoteRow = {
  id: string;
  workspace_id: string;
  created_by: string;
  title: string;
  content: string;
  icon: string;
  favorite: boolean;
  created_at: string;
  updated_at: string;
};

type WorkspaceWhiteboardRow = {
  id: string;
  workspace_id: string;
  title: string;
  created_by: string;
  elements: unknown;
  app_state: unknown;
  files: unknown;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkspaceCloudSyncResult = {
  workspaceId: string;
  notes: WorkspaceNote[];
  whiteboards: WorkspaceWhiteboardDocument[];
  noteAliases: Record<string, string>;
  whiteboardAliases: Record<string, string>;
};

export type WorkspaceCloudStatus =
  | "idle"
  | "syncing"
  | "synced"
  | "offline"
  | "error";

export type WorkspaceCloudStatusDetail = {
  userId: string;
  status: WorkspaceCloudStatus;
  error?: string;
};

export const WORKSPACE_CLOUD_STATUS_EVENT =
  "scripticx:workspace-cloud-status" as const;

export class WorkspaceCloudError extends Error {
  constructor(
    public readonly code:
      | "not-authenticated"
      | "workspace-unavailable"
      | "read-failed"
      | "write-failed",
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "WorkspaceCloudError";
  }
}

const workspacePromises = new Map<string, Promise<string>>();
const resolvedWorkspaceIds = new Map<string, string>();
const syncPromises = new Map<string, Promise<WorkspaceCloudSyncResult>>();
const resyncRequested = new Set<string>();
const noteWritePromises = new Map<string, Promise<WorkspaceNote>>();
const whiteboardWritePromises = new Map<
  string,
  Promise<WorkspaceWhiteboardDocument>
>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function isWorkspaceCloudUuid(value: string) {
  return UUID_PATTERN.test(value);
}

export function remoteWorkspaceDeletionId(
  localId: string,
  aliases: Record<string, string>
) {
  const resolvedId = aliases[localId] || localId;
  return isWorkspaceCloudUuid(resolvedId) ? resolvedId : null;
}

function createUuid() {
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  throw new WorkspaceCloudError(
    "workspace-unavailable",
    "This browser cannot create secure workspace identifiers."
  );
}

function cloudStateKey(userId: string) {
  return `${CLOUD_STATE_PREFIX}:${encodeURIComponent(userId)}`;
}

function emptyCloudState(): WorkspaceCloudState {
  return {
    version: CLOUD_STATE_VERSION,
    workspaceId: null,
    knownNoteIds: [],
    knownWhiteboardIds: [],
    noteAliases: {},
    whiteboardAliases: {},
    deletedNotes: {},
    deletedWhiteboards: {},
    lastSyncedAt: null,
  };
}

function stringRecord(value: unknown) {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readCloudState(userId: string): WorkspaceCloudState {
  if (typeof window === "undefined") return emptyCloudState();
  try {
    const raw = window.localStorage.getItem(cloudStateKey(userId));
    if (!raw) return emptyCloudState();
    const value = JSON.parse(raw) as unknown;
    if (!isRecord(value) || value.version !== CLOUD_STATE_VERSION) {
      return emptyCloudState();
    }
    return {
      version: CLOUD_STATE_VERSION,
      workspaceId:
        typeof value.workspaceId === "string" ? value.workspaceId : null,
      knownNoteIds: stringArray(value.knownNoteIds),
      knownWhiteboardIds: stringArray(value.knownWhiteboardIds),
      noteAliases: stringRecord(value.noteAliases),
      whiteboardAliases: stringRecord(value.whiteboardAliases),
      deletedNotes: stringRecord(value.deletedNotes),
      deletedWhiteboards: stringRecord(value.deletedWhiteboards),
      lastSyncedAt: validTimestamp(value.lastSyncedAt)
        ? value.lastSyncedAt
        : null,
    };
  } catch {
    return emptyCloudState();
  }
}

function writeCloudState(userId: string, state: WorkspaceCloudState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(cloudStateKey(userId), JSON.stringify(state));
  } catch {
    // The workspace cache remains usable even when metadata cannot be stored.
  }
}

/**
 * A raw cache revision is stable even when no snapshot has been persisted.
 * Fallback snapshots contain `now()` timestamps, so comparing their updatedAt
 * values incorrectly looks like a concurrent edit on a brand-new browser.
 */
function readWorkspaceStorageRevision(userId: string): string | null | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage.getItem(getStudentWorkspaceStorageKey(userId));
  } catch {
    return undefined;
  }
}

export function didWorkspaceStorageChange(
  initialRevision: string | null | undefined,
  latestRevision: string | null | undefined,
  initialUpdatedAt: string,
  latestUpdatedAt: string
) {
  return initialRevision === undefined
    ? latestUpdatedAt !== initialUpdatedAt
    : latestRevision !== initialRevision;
}

function emitCloudStatus(detail: WorkspaceCloudStatusDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<WorkspaceCloudStatusDetail>(WORKSPACE_CLOUD_STATUS_EVENT, {
      detail,
    })
  );
}

function cloudErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (isRecord(error) && typeof error.message === "string") return error.message;
  return "Workspace cloud synchronization failed.";
}

function throwCloudError(
  code: WorkspaceCloudError["code"],
  message: string,
  cause: unknown
): never {
  throw new WorkspaceCloudError(code, message, cause);
}

function jsonObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function noteFromRow(row: WorkspaceNoteRow): WorkspaceNote {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    icon: row.icon,
    favorite: row.favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function whiteboardFromRow(
  row: WorkspaceWhiteboardRow
): WorkspaceWhiteboardDocument {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    scene: {
      elements: Array.isArray(row.elements) ? row.elements : [],
      appState: jsonObject(row.app_state),
      files: jsonObject(row.files),
      updatedAt: row.updated_at,
    },
  };
}

function noteInsertPayload(
  userId: string,
  workspaceId: string,
  note: WorkspaceNote
) {
  return {
    id: note.id,
    workspace_id: workspaceId,
    created_by: userId,
    title: note.title,
    content: note.content,
    icon: note.icon,
    favorite: note.favorite,
  };
}

function noteUpdatePayload(note: WorkspaceNote) {
  return {
    title: note.title,
    content: note.content,
    icon: note.icon,
    favorite: note.favorite,
  };
}

function whiteboardInsertPayload(
  userId: string,
  workspaceId: string,
  document: WorkspaceWhiteboardDocument
) {
  return {
    id: document.id,
    workspace_id: workspaceId,
    title: document.title,
    created_by: userId,
    updated_by: userId,
    elements: document.scene.elements,
    app_state: document.scene.appState,
    files: document.scene.files,
  };
}

function whiteboardUpdatePayload(
  userId: string,
  document: WorkspaceWhiteboardDocument
) {
  return {
    title: document.title,
    updated_by: userId,
    elements: document.scene.elements,
    app_state: document.scene.appState,
    files: document.scene.files,
  };
}

export function newerWorkspaceDocument<T extends { updatedAt: string }>(
  local: T,
  remote: T
) {
  return Date.parse(local.updatedAt) > Date.parse(remote.updatedAt)
    ? local
    : remote;
}

function canonicalId(
  id: string,
  aliases: Record<string, string>
): string {
  if (isWorkspaceCloudUuid(id)) return id;
  return aliases[id] || (aliases[id] = createUuid());
}

export function resolveWorkspaceCloudAlias(
  userId: string,
  kind: WorkspaceEntityKind,
  id: string
) {
  const state = readCloudState(userId);
  return kind === "note"
    ? state.noteAliases[id] || id
    : state.whiteboardAliases[id] || id;
}

async function queryStudentWorkspace(userId: string) {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id")
    .eq("kind", "student")
    .eq("created_by", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    throwCloudError(
      "workspace-unavailable",
      "Could not open the student workspace.",
      error
    );
  }
  return typeof data?.id === "string" ? data.id : null;
}

export async function ensureStudentWorkspace(userId: string) {
  if (!userId) {
    throw new WorkspaceCloudError(
      "not-authenticated",
      "Sign in to synchronize this workspace."
    );
  }
  const resolvedWorkspaceId = resolvedWorkspaceIds.get(userId);
  if (resolvedWorkspaceId) return resolvedWorkspaceId;
  const existingPromise = workspacePromises.get(userId);
  if (existingPromise) return existingPromise;

  const promise = (async () => {
    const existing = await queryStudentWorkspace(userId);
    if (existing) return existing;

    const { error } = await supabase.rpc("provision_default_workspaces", {
      p_persona: "student",
      p_workspace_name: "ScripticX School",
    });
    if (error) {
      throwCloudError(
        "workspace-unavailable",
        "Could not prepare the student workspace.",
        error
      );
    }

    const provisioned = await queryStudentWorkspace(userId);
    if (!provisioned) {
      throw new WorkspaceCloudError(
        "workspace-unavailable",
        "The student workspace was not created."
      );
    }
    return provisioned;
  })();

  workspacePromises.set(userId, promise);
  try {
    const workspaceId = await promise;
    resolvedWorkspaceIds.set(userId, workspaceId);
    return workspaceId;
  } finally {
    workspacePromises.delete(userId);
  }
}

async function readRemoteDocuments(workspaceId: string) {
  const [notesResponse, whiteboardsResponse] = await Promise.all([
    supabase
      .from("workspace_notes")
      .select(
        "id,workspace_id,created_by,title,content,icon,favorite,created_at,updated_at"
      )
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("workspace_whiteboards")
      .select(
        "id,workspace_id,title,created_by,elements,app_state,files,updated_by,created_at,updated_at"
      )
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false }),
  ]);

  if (notesResponse.error) {
    throwCloudError(
      "read-failed",
      "Could not load notes from the cloud.",
      notesResponse.error
    );
  }
  if (whiteboardsResponse.error) {
    throwCloudError(
      "read-failed",
      "Could not load whiteboards from the cloud.",
      whiteboardsResponse.error
    );
  }

  return {
    notes: ((notesResponse.data || []) as WorkspaceNoteRow[]).map(noteFromRow),
    whiteboards: (
      (whiteboardsResponse.data || []) as WorkspaceWhiteboardRow[]
    ).map(whiteboardFromRow),
  };
}

async function upsertNote(
  userId: string,
  workspaceId: string,
  note: WorkspaceNote
) {
  const { data: existing, error: lookupError } = await supabase
    .from("workspace_notes")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("id", note.id)
    .maybeSingle();
  if (lookupError) {
    throwCloudError("write-failed", "Could not save the note online.", lookupError);
  }

  let response = existing
    ? await supabase
        .from("workspace_notes")
        .update(noteUpdatePayload(note))
        .eq("workspace_id", workspaceId)
        .eq("id", note.id)
        .select(
          "id,workspace_id,created_by,title,content,icon,favorite,created_at,updated_at"
        )
        .single()
    : await supabase
        .from("workspace_notes")
        .insert(noteInsertPayload(userId, workspaceId, note))
        .select(
          "id,workspace_id,created_by,title,content,icon,favorite,created_at,updated_at"
        )
        .single();

  // A second tab can insert the same UUID between the lookup and insert.
  if (!existing && response.error?.code === "23505") {
    response = await supabase
      .from("workspace_notes")
      .update(noteUpdatePayload(note))
      .eq("workspace_id", workspaceId)
      .eq("id", note.id)
    .select(
      "id,workspace_id,created_by,title,content,icon,favorite,created_at,updated_at"
    )
    .single();
  }
  if (response.error) {
    throwCloudError(
      "write-failed",
      "Could not save the note online.",
      response.error
    );
  }
  return noteFromRow(response.data as WorkspaceNoteRow);
}

async function upsertWhiteboard(
  userId: string,
  workspaceId: string,
  document: WorkspaceWhiteboardDocument
) {
  const { data: existing, error: lookupError } = await supabase
    .from("workspace_whiteboards")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("id", document.id)
    .maybeSingle();
  if (lookupError) {
    throwCloudError(
      "write-failed",
      "Could not save the whiteboard online.",
      lookupError
    );
  }

  let response = existing
    ? await supabase
        .from("workspace_whiteboards")
        .update(whiteboardUpdatePayload(userId, document))
        .eq("workspace_id", workspaceId)
        .eq("id", document.id)
        .select(
          "id,workspace_id,title,created_by,elements,app_state,files,updated_by,created_at,updated_at"
        )
        .single()
    : await supabase
        .from("workspace_whiteboards")
        .insert(whiteboardInsertPayload(userId, workspaceId, document))
        .select(
          "id,workspace_id,title,created_by,elements,app_state,files,updated_by,created_at,updated_at"
        )
        .single();

  if (!existing && response.error?.code === "23505") {
    response = await supabase
      .from("workspace_whiteboards")
      .update(whiteboardUpdatePayload(userId, document))
      .eq("workspace_id", workspaceId)
      .eq("id", document.id)
      .select(
        "id,workspace_id,title,created_by,elements,app_state,files,updated_by,created_at,updated_at"
      )
      .single();
  }
  if (response.error) {
    throwCloudError(
      "write-failed",
      "Could not save the whiteboard online.",
      response.error
    );
  }
  return whiteboardFromRow(response.data as WorkspaceWhiteboardRow);
}

async function processTombstones(
  userId: string,
  workspaceId: string,
  state: WorkspaceCloudState
) {
  for (const id of Object.keys(state.deletedNotes)) {
    if (!isWorkspaceCloudUuid(id)) {
      delete state.deletedNotes[id];
      state.knownNoteIds = state.knownNoteIds.filter(
        (knownId) => knownId !== id
      );
      continue;
    }
    const { error } = await supabase
      .from("workspace_notes")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", id);
    if (error) {
      throwCloudError("write-failed", "Could not delete the note online.", error);
    }
    delete state.deletedNotes[id];
    state.knownNoteIds = state.knownNoteIds.filter((knownId) => knownId !== id);
  }

  for (const id of Object.keys(state.deletedWhiteboards)) {
    if (!isWorkspaceCloudUuid(id)) {
      delete state.deletedWhiteboards[id];
      state.knownWhiteboardIds = state.knownWhiteboardIds.filter(
        (knownId) => knownId !== id
      );
      continue;
    }
    const { error } = await supabase
      .from("workspace_whiteboards")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("id", id);
    if (error) {
      throwCloudError(
        "write-failed",
        "Could not delete the whiteboard online.",
        error
      );
    }
    delete state.deletedWhiteboards[id];
    state.knownWhiteboardIds = state.knownWhiteboardIds.filter(
      (knownId) => knownId !== id
    );
  }
  writeCloudState(userId, state);
}

export function shouldRestoreLocalWorkspaceDocument(
  updatedAt: string,
  knownRemotely: boolean,
  lastSyncedAt: string | null
) {
  if (!knownRemotely || !lastSyncedAt) return true;
  return Date.parse(updatedAt) > Date.parse(lastSyncedAt);
}

export function isPristineWelcomeNote(note: WorkspaceNote) {
  return isPristineLegacyWelcomeNote(note);
}

export function isPristineDefaultWhiteboard(
  document: WorkspaceWhiteboardDocument
) {
  return (
    document.id === DEFAULT_WHITEBOARD_ID &&
    document.title === "Whiteboard" &&
    document.createdAt === document.updatedAt &&
    document.scene.elements.length === 0 &&
    Object.keys(document.scene.appState).length === 0 &&
    Object.keys(document.scene.files).length === 0
  );
}

async function runSynchronization(
  userId: string
): Promise<WorkspaceCloudSyncResult> {
  emitCloudStatus({ userId, status: "syncing" });
  const initialStorageRevision = readWorkspaceStorageRevision(userId);
  const initialSnapshot = createWorkspaceStorageRepository(userId).getSnapshot();
  const state = readCloudState(userId);
  const workspaceId = await ensureStudentWorkspace(userId);
  state.workspaceId = workspaceId;
  await processTombstones(userId, workspaceId, state);

  const remote = await readRemoteDocuments(workspaceId);
  // Older versions could upload the demo note after assigning it a UUID.
  // Keep those untouched generated rows out of the user's real library.
  const remoteNotes = new Map(
    remote.notes
      .filter((note) => !hasPristineWelcomeNotePayload(note))
      .map((note) => [note.id, note])
  );
  const remoteWhiteboards = new Map(
    remote.whiteboards.map((document) => [document.id, document])
  );
  const knownNoteIds = new Set(state.knownNoteIds);
  const knownWhiteboardIds = new Set(state.knownWhiteboardIds);
  const mergedNotes = new Map<string, WorkspaceNote>();
  const mergedWhiteboards = new Map<string, WorkspaceWhiteboardDocument>();

  for (const sourceNote of initialSnapshot.notes) {
    if (isPristineLegacyWelcomeNote(sourceNote)) continue;
    const id = canonicalId(sourceNote.id, state.noteAliases);
    if (state.deletedNotes[id]) continue;
    const local = id === sourceNote.id ? sourceNote : { ...sourceNote, id };
    const remoteNote = remoteNotes.get(id);
    if (remoteNote) {
      const preferred = newerWorkspaceDocument(local, remoteNote);
      mergedNotes.set(
        id,
        preferred === local
          ? await upsertNote(userId, workspaceId, local)
          : remoteNote
      );
      remoteNotes.delete(id);
    } else if (
      shouldRestoreLocalWorkspaceDocument(
        local.updatedAt,
        knownNoteIds.has(id),
        state.lastSyncedAt
      )
    ) {
      mergedNotes.set(id, await upsertNote(userId, workspaceId, local));
    }
  }
  remoteNotes.forEach((note, id) => {
    if (!state.deletedNotes[id]) mergedNotes.set(id, note);
  });

  for (const sourceDocument of initialSnapshot.whiteboards) {
    if (
      remote.whiteboards.length > 0 &&
      isPristineDefaultWhiteboard(sourceDocument)
    ) {
      continue;
    }
    const id = canonicalId(sourceDocument.id, state.whiteboardAliases);
    if (state.deletedWhiteboards[id]) continue;
    const local =
      id === sourceDocument.id
        ? sourceDocument
        : { ...sourceDocument, id };
    const remoteDocument = remoteWhiteboards.get(id);
    if (remoteDocument) {
      const preferred = newerWorkspaceDocument(local, remoteDocument);
      mergedWhiteboards.set(
        id,
        preferred === local
          ? await upsertWhiteboard(userId, workspaceId, local)
          : remoteDocument
      );
      remoteWhiteboards.delete(id);
    } else if (
      shouldRestoreLocalWorkspaceDocument(
        local.updatedAt,
        knownWhiteboardIds.has(id),
        state.lastSyncedAt
      )
    ) {
      mergedWhiteboards.set(
        id,
        await upsertWhiteboard(userId, workspaceId, local)
      );
    }
  }
  remoteWhiteboards.forEach((document, id) => {
    if (!state.deletedWhiteboards[id]) mergedWhiteboards.set(id, document);
  });

  const latestSnapshot = createWorkspaceStorageRepository(userId).getSnapshot();
  const latestStorageRevision = readWorkspaceStorageRevision(userId);
  const localWorkspaceChanged = didWorkspaceStorageChange(
    initialStorageRevision,
    latestStorageRevision,
    initialSnapshot.updatedAt,
    latestSnapshot.updatedAt
  );
  if (localWorkspaceChanged) {
    resyncRequested.add(userId);
  } else {
    const activeId =
      state.whiteboardAliases[initialSnapshot.activeWhiteboardId] ||
      initialSnapshot.activeWhiteboardId;
    hydrateWorkspaceCloudDocuments(userId, {
      notes: [...mergedNotes.values()],
      whiteboards: [...mergedWhiteboards.values()],
      activeWhiteboardId: activeId,
    });
  }

  state.knownNoteIds = [...mergedNotes.keys()];
  state.knownWhiteboardIds = [...mergedWhiteboards.keys()];
  state.lastSyncedAt = new Date().toISOString();
  writeCloudState(userId, state);
  emitCloudStatus({ userId, status: "synced" });

  return {
    workspaceId,
    notes: [...mergedNotes.values()],
    whiteboards: [...mergedWhiteboards.values()],
    noteAliases: { ...state.noteAliases },
    whiteboardAliases: { ...state.whiteboardAliases },
  };
}

export async function synchronizeStudentWorkspace(userId: string) {
  const existing = syncPromises.get(userId);
  if (existing) {
    resyncRequested.add(userId);
    return existing;
  }

  const promise = runSynchronization(userId).catch((error) => {
    emitCloudStatus({
      userId,
      status:
        typeof navigator !== "undefined" && !navigator.onLine
          ? "offline"
          : "error",
      error: cloudErrorMessage(error),
    });
    throw error;
  });
  syncPromises.set(userId, promise);
  try {
    return await promise;
  } finally {
    syncPromises.delete(userId);
    if (resyncRequested.delete(userId)) {
      window.setTimeout(() => {
        void synchronizeStudentWorkspace(userId).catch(() => undefined);
      }, 0);
    }
  }
}

function replaceCachedNote(
  userId: string,
  previousId: string,
  saved: WorkspaceNote
) {
  const snapshot = createWorkspaceStorageRepository(userId).getSnapshot();
  const notes = snapshot.notes
    .filter((note) => note.id !== previousId && note.id !== saved.id)
    .concat(saved);
  hydrateWorkspaceCloudDocuments(userId, {
    notes,
    whiteboards: snapshot.whiteboards,
    activeWhiteboardId: snapshot.activeWhiteboardId,
  });
}

function replaceCachedWhiteboard(
  userId: string,
  previousId: string,
  saved: WorkspaceWhiteboardDocument
) {
  const snapshot = createWorkspaceStorageRepository(userId).getSnapshot();
  const whiteboards = snapshot.whiteboards
    .filter(
      (document) => document.id !== previousId && document.id !== saved.id
    )
    .concat(saved);
  hydrateWorkspaceCloudDocuments(userId, {
    notes: snapshot.notes,
    whiteboards,
    activeWhiteboardId:
      snapshot.activeWhiteboardId === previousId
        ? saved.id
        : snapshot.activeWhiteboardId,
  });
}

export async function persistWorkspaceNote(
  userId: string,
  note: WorkspaceNote
) {
  const writeKey = `${userId}:${note.id}:${note.updatedAt}`;
  const existing = noteWritePromises.get(writeKey);
  if (existing) return existing;
  const operation = (async () => {
    const workspaceId = await ensureStudentWorkspace(userId);
    const state = readCloudState(userId);
    state.workspaceId = workspaceId;
    const id = canonicalId(note.id, state.noteAliases);
    const canonical = id === note.id ? note : { ...note, id };
    const saved = await upsertNote(userId, workspaceId, canonical);
    state.knownNoteIds = [...new Set([...state.knownNoteIds, saved.id])];
    delete state.deletedNotes[saved.id];
    writeCloudState(userId, state);
    if (saved.id !== note.id) replaceCachedNote(userId, note.id, saved);
    return saved;
  })();
  noteWritePromises.set(writeKey, operation);
  try {
    return await operation;
  } finally {
    if (noteWritePromises.get(writeKey) === operation) {
      noteWritePromises.delete(writeKey);
    }
  }
}

export async function deleteWorkspaceNoteFromCloud(
  userId: string,
  noteId: string
) {
  const state = readCloudState(userId);
  const id = remoteWorkspaceDeletionId(noteId, state.noteAliases);
  if (!id) {
    delete state.deletedNotes[noteId];
    state.knownNoteIds = state.knownNoteIds.filter(
      (knownId) => knownId !== noteId
    );
    writeCloudState(userId, state);
    return;
  }
  state.deletedNotes[id] = new Date().toISOString();
  writeCloudState(userId, state);
  const workspaceId = await ensureStudentWorkspace(userId);
  await processTombstones(userId, workspaceId, state);
}

export async function persistWorkspaceWhiteboard(
  userId: string,
  document: WorkspaceWhiteboardDocument
) {
  const writeKey = `${userId}:${document.id}:${document.updatedAt}`;
  const existing = whiteboardWritePromises.get(writeKey);
  if (existing) return existing;
  const operation = (async () => {
    const workspaceId = await ensureStudentWorkspace(userId);
    const state = readCloudState(userId);
    state.workspaceId = workspaceId;
    const id = canonicalId(document.id, state.whiteboardAliases);
    const canonical = id === document.id ? document : { ...document, id };
    const saved = await upsertWhiteboard(userId, workspaceId, canonical);
    state.knownWhiteboardIds = [
      ...new Set([...state.knownWhiteboardIds, saved.id]),
    ];
    delete state.deletedWhiteboards[saved.id];
    writeCloudState(userId, state);
    if (saved.id !== document.id) {
      replaceCachedWhiteboard(userId, document.id, saved);
    }
    return saved;
  })();
  whiteboardWritePromises.set(writeKey, operation);
  try {
    return await operation;
  } finally {
    if (whiteboardWritePromises.get(writeKey) === operation) {
      whiteboardWritePromises.delete(writeKey);
    }
  }
}

export async function deleteWorkspaceWhiteboardFromCloud(
  userId: string,
  whiteboardId: string
) {
  const state = readCloudState(userId);
  const id = remoteWorkspaceDeletionId(
    whiteboardId,
    state.whiteboardAliases
  );
  if (!id) {
    delete state.deletedWhiteboards[whiteboardId];
    state.knownWhiteboardIds = state.knownWhiteboardIds.filter(
      (knownId) => knownId !== whiteboardId
    );
    writeCloudState(userId, state);
    return;
  }
  state.deletedWhiteboards[id] = new Date().toISOString();
  writeCloudState(userId, state);
  const workspaceId = await ensureStudentWorkspace(userId);
  await processTombstones(userId, workspaceId, state);
}

export async function pushWorkspaceLocalChange(
  userId: string,
  detail: WorkspaceStorageEventDetail
) {
  if (detail.reason === "cloud-synced" || detail.reason.startsWith("graph-")) {
    return;
  }
  if (detail.reason === "storage" || detail.reason === "reset") {
    await synchronizeStudentWorkspace(userId);
    return;
  }
  if (!detail.entityId) return;

  if (detail.reason === "note-deleted") {
    await deleteWorkspaceNoteFromCloud(userId, detail.entityId);
    return;
  }
  if (detail.reason === "whiteboard-deleted") {
    await deleteWorkspaceWhiteboardFromCloud(userId, detail.entityId);
    await synchronizeStudentWorkspace(userId);
    return;
  }
  if (detail.reason === "note-created" || detail.reason === "note-updated") {
    const note = getNote(userId, detail.entityId);
    if (note) await persistWorkspaceNote(userId, note);
    return;
  }
  if (
    detail.reason === "whiteboard-created" ||
    detail.reason === "whiteboard-updated" ||
    detail.reason === "whiteboard-saved"
  ) {
    const document = getWhiteboardDocument(userId, detail.entityId);
    if (document) await persistWorkspaceWhiteboard(userId, document);
  }
}

export function subscribeWorkspaceCloudStatus(
  userId: string,
  listener: (detail: WorkspaceCloudStatusDetail) => void
) {
  if (typeof window === "undefined") return () => undefined;
  const onStatus = (event: Event) => {
    const detail = (event as CustomEvent<WorkspaceCloudStatusDetail>).detail;
    if (detail?.userId === userId) listener(detail);
  };
  window.addEventListener(WORKSPACE_CLOUD_STATUS_EVENT, onStatus);
  return () => window.removeEventListener(WORKSPACE_CLOUD_STATUS_EVENT, onStatus);
}

export function currentCachedWhiteboard(userId: string) {
  const id = getActiveWhiteboardId(userId);
  return id ? getWhiteboardDocument(userId, id) : null;
}

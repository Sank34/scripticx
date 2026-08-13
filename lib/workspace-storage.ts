import { STUDENT_WORKSPACE_ID } from "@/lib/workspaces";

export type WorkspaceJsonObject = { [key: string]: unknown };

export type WorkspaceNote = {
  id: string;
  title: string;
  content: string;
  icon: string;
  favorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateWorkspaceNoteInput = {
  title?: string;
  content?: string;
  icon?: string;
  favorite?: boolean;
};

export type UpdateWorkspaceNotePatch = Partial<
  Pick<WorkspaceNote, "title" | "content" | "icon" | "favorite">
>;

export type WorkspaceWhiteboardScene = {
  elements?: unknown[];
  appState?: WorkspaceJsonObject;
  files?: WorkspaceJsonObject;
  updatedAt?: string;
};

export type WorkspaceWhiteboardDocument = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  scene: Required<WorkspaceWhiteboardScene>;
};

export type CreateWorkspaceWhiteboardInput = {
  title?: string;
};

export type UpdateWorkspaceWhiteboardPatch = {
  title?: string;
  scene?: WorkspaceWhiteboardScene;
};

export type WorkspaceGraphPosition = {
  x: number;
  y: number;
};

export type WorkspaceGraphNode = {
  id: string;
  label: string;
  position?: WorkspaceGraphPosition;
};

export type WorkspaceGraphEdge = {
  id: string;
  source: string;
  target: string;
};

export type WorkspaceGraphCustomLabels =
  | string[]
  | Record<string, string>;

export type WorkspaceGraph = {
  id: string;
  title: string;
  directed: boolean;
  indexMode: string;
  nodeCount: number;
  customLabels: WorkspaceGraphCustomLabels;
  source: string;
  nodes: WorkspaceGraphNode[];
  edges: WorkspaceGraphEdge[];
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceGraphInput = {
  id?: string;
  title?: string;
  directed?: boolean;
  indexMode?: string;
  nodeCount?: number;
  customLabels?: WorkspaceGraphCustomLabels;
  source?: string;
  nodes?: WorkspaceGraphNode[];
  edges?: WorkspaceGraphEdge[];
  createdAt?: string;
  updatedAt?: string;
};

export type GraphWhiteboardPayload = {
  id: string;
  title: string;
  nodes: WorkspaceGraphNode[];
  edges: WorkspaceGraphEdge[];
  directed: boolean;
  createdAt: string;
};

export type GraphWhiteboardPayloadInput = {
  id?: string;
  title?: string;
  nodes?: WorkspaceGraphNode[];
  edges?: WorkspaceGraphEdge[];
  directed?: boolean;
  createdAt?: string;
};

export type StudentWorkspaceSnapshot = {
  version: typeof STUDENT_WORKSPACE_STORAGE_VERSION;
  workspaceId: typeof STUDENT_WORKSPACE_ID;
  notes: WorkspaceNote[];
  /** @deprecated Use whiteboards and activeWhiteboardId. */
  whiteboard: WorkspaceWhiteboardScene | null;
  whiteboards: WorkspaceWhiteboardDocument[];
  activeWhiteboardId: string;
  graphs: WorkspaceGraph[];
  queuedGraphForWhiteboard: GraphWhiteboardPayload | null;
  updatedAt: string;
};

export type WorkspaceStorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type WorkspaceStorageChangeReason =
  | "note-created"
  | "note-updated"
  | "note-deleted"
  | "whiteboard-created"
  | "whiteboard-updated"
  | "whiteboard-deleted"
  | "whiteboard-active-changed"
  | "whiteboard-saved"
  | "graph-saved"
  | "graph-deleted"
  | "graph-queued"
  | "graph-consumed"
  | "reset"
  | "storage";

export type WorkspaceStorageEventDetail = {
  userId: string;
  storageKey: string;
  reason: WorkspaceStorageChangeReason;
};

export type WorkspaceStorageRepositoryOptions = {
  storage?: WorkspaceStorageLike | null;
  now?: () => Date;
  createId?: () => string;
  notify?: (detail: WorkspaceStorageEventDetail) => void;
};

export type WorkspaceStorageRepository = {
  getSnapshot(): StudentWorkspaceSnapshot;
  listNotes(): WorkspaceNote[];
  getNote(id: string): WorkspaceNote | null;
  createNote(input?: CreateWorkspaceNoteInput): WorkspaceNote;
  updateNote(id: string, patch: UpdateWorkspaceNotePatch): WorkspaceNote | null;
  deleteNote(id: string): boolean;
  listWhiteboards(): WorkspaceWhiteboardDocument[];
  getWhiteboardDocument(id: string): WorkspaceWhiteboardDocument | null;
  createWhiteboard(
    input?: CreateWorkspaceWhiteboardInput
  ): WorkspaceWhiteboardDocument;
  updateWhiteboard(
    id: string,
    patch: UpdateWorkspaceWhiteboardPatch
  ): WorkspaceWhiteboardDocument | null;
  deleteWhiteboard(id: string): boolean;
  getActiveWhiteboardId(): string | null;
  setActiveWhiteboardId(id: string): string | null;
  /** @deprecated Use getWhiteboardDocument with the active id. */
  getWhiteboard(): WorkspaceWhiteboardScene | null;
  /** @deprecated Use updateWhiteboard with the active id. */
  saveWhiteboard(scene: WorkspaceWhiteboardScene): WorkspaceWhiteboardScene;
  listGraphs(): WorkspaceGraph[];
  getGraph(id: string): WorkspaceGraph | null;
  saveGraph(graph: WorkspaceGraphInput): WorkspaceGraph;
  deleteGraph(id: string): boolean;
  queueGraphForWhiteboard(
    payload: GraphWhiteboardPayloadInput
  ): GraphWhiteboardPayload;
  getQueuedGraphForWhiteboard(): GraphWhiteboardPayload | null;
  consumeGraphForWhiteboard(): GraphWhiteboardPayload | null;
  reset(): void;
};

export const STUDENT_WORKSPACE_STORAGE_VERSION = 2 as const;
export const WORKSPACE_STORAGE_EVENT = "scripticx:workspace-storage" as const;
export const WELCOME_NOTE_ID = "student-workspace-welcome" as const;
export const DEFAULT_WHITEBOARD_ID = "student-workspace-whiteboard-default" as const;

// Keep the key stable across schema upgrades; the envelope version drives
// future migrations without making existing browser data unreachable.
const STORAGE_NAMESPACE = `scripticx:${STUDENT_WORKSPACE_ID}`;
const DEFAULT_NOTE_TITLE = "Notiță fără titlu";
const DEFAULT_WHITEBOARD_TITLE = "Whiteboard";
const DEFAULT_GRAPH_TITLE = "Graf fără titlu";
const MAX_TITLE_LENGTH = 160;
const MAX_NOTE_LENGTH = 1_000_000;
const MAX_GRAPH_SOURCE_LENGTH = 500_000;

export class WorkspaceStorageUnavailableError extends Error {
  constructor(message = "Browser storage is not available") {
    super(message);
    this.name = "WorkspaceStorageUnavailableError";
  }
}

export class WorkspaceStorageWriteError extends Error {
  constructor(cause: unknown) {
    super(
      cause instanceof Error
        ? `Could not save workspace data: ${cause.message}`
        : "Could not save workspace data"
    );
    this.name = "WorkspaceStorageWriteError";
  }
}

export class WorkspaceStorageVersionError extends Error {
  constructor(version: number) {
    super(
      `Workspace data uses newer storage version ${version}; refusing to overwrite it`
    );
    this.name = "WorkspaceStorageVersionError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeText(value: unknown, fallback = "", maxLength = MAX_NOTE_LENGTH) {
  return typeof value === "string" ? value.slice(0, maxLength) : fallback;
}

function safeTitle(value: unknown, fallback: string) {
  const title = safeText(value, "", MAX_TITLE_LENGTH).trim();
  return title || fallback;
}

function validId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function dateToIso(value: Date) {
  return Number.isFinite(value.getTime())
    ? value.toISOString()
    : new Date().toISOString();
}

function cloneJson<T>(value: T, fallback: T): T {
  try {
    const serialized = JSON.stringify(value);
    if (serialized === undefined) return fallback;
    return JSON.parse(serialized) as T;
  } catch {
    return fallback;
  }
}

function parsedStorageVersion(raw: string | null) {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (!isRecord(value) || typeof value.version !== "number") return null;
    return value.version;
  } catch {
    return null;
  }
}

function parsePosition(value: unknown): WorkspaceGraphPosition | undefined {
  if (!isRecord(value)) return undefined;
  const x = Number(value.x);
  const y = Number(value.y);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined;
}

function parseGraphNodes(value: unknown): WorkspaceGraphNode[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || !validId(item.id)) return [];
    const position = parsePosition(item.position);
    return [
      {
        id: item.id,
        label: safeText(item.label, item.id, MAX_TITLE_LENGTH),
        ...(position ? { position } : {}),
      },
    ];
  });
}

function parseGraphEdges(value: unknown): WorkspaceGraphEdge[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (
      !isRecord(item) ||
      !validId(item.id) ||
      !validId(item.source) ||
      !validId(item.target)
    ) {
      return [];
    }
    return [{ id: item.id, source: item.source, target: item.target }];
  });
}

function parseCustomLabels(value: unknown): WorkspaceGraphCustomLabels {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  if (!isRecord(value)) return [];
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

function parseNote(value: unknown, fallbackNow: string): WorkspaceNote | null {
  if (!isRecord(value) || !validId(value.id)) return null;
  const createdAt = validTimestamp(value.createdAt)
    ? value.createdAt
    : fallbackNow;
  return {
    id: value.id,
    title: safeTitle(value.title, DEFAULT_NOTE_TITLE),
    content: safeText(value.content),
    icon: safeText(value.icon, "📝", 16) || "📝",
    favorite: value.favorite === true,
    createdAt,
    updatedAt: validTimestamp(value.updatedAt) ? value.updatedAt : createdAt,
  };
}

function parseWhiteboard(
  value: unknown,
  fallbackNow: string
): Required<WorkspaceWhiteboardScene> | null {
  if (!isRecord(value)) return null;
  const elements = Array.isArray(value.elements)
    ? cloneJson(value.elements, [])
    : [];
  const appState = isRecord(value.appState)
    ? cloneJson(value.appState, {})
    : {};
  const files = isRecord(value.files) ? cloneJson(value.files, {}) : {};
  return {
    elements,
    appState,
    files,
    updatedAt: validTimestamp(value.updatedAt) ? value.updatedAt : fallbackNow,
  };
}

function createEmptyWhiteboardScene(
  timestamp: string
): Required<WorkspaceWhiteboardScene> {
  return {
    elements: [],
    appState: {},
    files: {},
    updatedAt: timestamp,
  };
}

function createDefaultWhiteboardDocument(
  timestamp: string,
  legacyScene?: WorkspaceWhiteboardScene | null
): WorkspaceWhiteboardDocument {
  const scene =
    parseWhiteboard(legacyScene, timestamp) ||
    createEmptyWhiteboardScene(timestamp);
  return {
    id: DEFAULT_WHITEBOARD_ID,
    title: DEFAULT_WHITEBOARD_TITLE,
    createdAt: scene.updatedAt,
    updatedAt: scene.updatedAt,
    scene,
  };
}

function parseWhiteboardDocument(
  value: unknown,
  fallbackNow: string
): WorkspaceWhiteboardDocument | null {
  if (!isRecord(value) || !validId(value.id)) return null;
  const createdAt = validTimestamp(value.createdAt)
    ? value.createdAt
    : fallbackNow;
  const documentUpdatedAt = validTimestamp(value.updatedAt)
    ? value.updatedAt
    : createdAt;
  const scene =
    parseWhiteboard(value.scene, documentUpdatedAt) ||
    createEmptyWhiteboardScene(documentUpdatedAt);
  return {
    id: value.id,
    title: safeTitle(value.title, DEFAULT_WHITEBOARD_TITLE),
    createdAt,
    updatedAt: validTimestamp(value.updatedAt)
      ? value.updatedAt
      : scene.updatedAt,
    scene,
  };
}

function sortWhiteboards(documents: WorkspaceWhiteboardDocument[]) {
  return documents.slice().sort((left, right) => {
    const byUpdatedAt = right.updatedAt.localeCompare(left.updatedAt);
    return byUpdatedAt || left.id.localeCompare(right.id);
  });
}

function activeWhiteboardId(
  documents: WorkspaceWhiteboardDocument[],
  requestedId: unknown
) {
  if (
    validId(requestedId) &&
    documents.some((document) => document.id === requestedId)
  ) {
    return requestedId;
  }
  return sortWhiteboards(documents)[0]?.id || DEFAULT_WHITEBOARD_ID;
}

function withWhiteboardProjection(
  snapshot: StudentWorkspaceSnapshot
): StudentWorkspaceSnapshot {
  const timestamp = snapshot.updatedAt;
  const whiteboards = snapshot.whiteboards.length
    ? snapshot.whiteboards
    : [createDefaultWhiteboardDocument(timestamp, snapshot.whiteboard)];
  const selectedId = activeWhiteboardId(
    whiteboards,
    snapshot.activeWhiteboardId
  );
  const active = whiteboards.find((document) => document.id === selectedId);
  return {
    ...snapshot,
    whiteboards,
    activeWhiteboardId: selectedId,
    // Keep getSnapshot().whiteboard working while persisting only documents.
    whiteboard: active?.scene || null,
  };
}

function parseGraph(value: unknown, fallbackNow: string): WorkspaceGraph | null {
  if (!isRecord(value) || !validId(value.id)) return null;
  const nodes = parseGraphNodes(value.nodes);
  const createdAt = validTimestamp(value.createdAt)
    ? value.createdAt
    : fallbackNow;
  const suppliedNodeCount = Number(value.nodeCount);
  return {
    id: value.id,
    title: safeTitle(value.title, DEFAULT_GRAPH_TITLE),
    directed: value.directed === true,
    indexMode: safeText(value.indexMode, "zero", 40) || "zero",
    nodeCount:
      Number.isInteger(suppliedNodeCount) && suppliedNodeCount >= 0
        ? suppliedNodeCount
        : nodes.length,
    customLabels: parseCustomLabels(value.customLabels),
    source: safeText(value.source, "", MAX_GRAPH_SOURCE_LENGTH),
    nodes,
    edges: parseGraphEdges(value.edges),
    createdAt,
    updatedAt: validTimestamp(value.updatedAt) ? value.updatedAt : createdAt,
  };
}

function parseQueuedGraph(
  value: unknown,
  fallbackNow: string
): GraphWhiteboardPayload | null {
  if (!isRecord(value) || !validId(value.id)) return null;
  const nodes = parseGraphNodes(value.nodes);
  if (nodes.length === 0) return null;
  return {
    id: value.id,
    title: safeTitle(value.title, DEFAULT_GRAPH_TITLE),
    nodes,
    edges: parseGraphEdges(value.edges),
    directed: value.directed === true,
    createdAt: validTimestamp(value.createdAt) ? value.createdAt : fallbackNow,
  };
}

function uniqueById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function createWelcomeNote(now: string): WorkspaceNote {
  return {
    id: WELCOME_NOTE_ID,
    title: "Bine ai venit în workspace-ul de elev",
    content: [
      "# Bine ai venit! 👋",
      "",
      "Aici îți poți organiza notițele în Markdown, ideile și materialele de studiu.",
      "",
      "- Creează o notiță nouă pentru fiecare lecție.",
      "- Folosește **titluri**, liste și blocuri de cod.",
      "- Păstrează grafurile și schițele alături de notițe.",
    ].join("\n"),
    icon: "👋",
    favorite: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function createInitialStudentWorkspaceSnapshot(
  now = new Date().toISOString()
): StudentWorkspaceSnapshot {
  const safeNow = validTimestamp(now) ? now : new Date().toISOString();
  const defaultWhiteboard = createDefaultWhiteboardDocument(safeNow);
  return {
    version: STUDENT_WORKSPACE_STORAGE_VERSION,
    workspaceId: STUDENT_WORKSPACE_ID,
    notes: [createWelcomeNote(safeNow)],
    whiteboard: defaultWhiteboard.scene,
    whiteboards: [defaultWhiteboard],
    activeWhiteboardId: defaultWhiteboard.id,
    graphs: [],
    queuedGraphForWhiteboard: null,
    updatedAt: safeNow,
  };
}

/** Parses untrusted localStorage content and falls back without throwing. */
export function parseStudentWorkspaceSnapshot(
  raw: string | null,
  now = new Date().toISOString()
): StudentWorkspaceSnapshot {
  const fallback = createInitialStudentWorkspaceSnapshot(now);
  if (!raw) return fallback;

  try {
    const value = JSON.parse(raw) as unknown;
    if (
      !isRecord(value) ||
      (value.version !== 1 &&
        value.version !== STUDENT_WORKSPACE_STORAGE_VERSION) ||
      value.workspaceId !== STUDENT_WORKSPACE_ID
    ) {
      return fallback;
    }

    const notes = uniqueById(
      (Array.isArray(value.notes) ? value.notes : [])
        .map((item) => parseNote(item, fallback.updatedAt))
        .filter((item): item is WorkspaceNote => Boolean(item))
    );
    const graphs = uniqueById(
      (Array.isArray(value.graphs) ? value.graphs : [])
        .map((item) => parseGraph(item, fallback.updatedAt))
        .filter((item): item is WorkspaceGraph => Boolean(item))
    );
    const legacyWhiteboard = parseWhiteboard(
      value.whiteboard,
      fallback.updatedAt
    );
    const parsedWhiteboards = uniqueById(
      (Array.isArray(value.whiteboards) ? value.whiteboards : [])
        .map((item) => parseWhiteboardDocument(item, fallback.updatedAt))
        .filter((item): item is WorkspaceWhiteboardDocument => Boolean(item))
    );
    const whiteboards = parsedWhiteboards.length
      ? parsedWhiteboards
      : [
          createDefaultWhiteboardDocument(
            legacyWhiteboard?.updatedAt || fallback.updatedAt,
            legacyWhiteboard
          ),
        ];
    const selectedWhiteboardId = activeWhiteboardId(
      whiteboards,
      value.activeWhiteboardId
    );
    const selectedWhiteboard = whiteboards.find(
      (document) => document.id === selectedWhiteboardId
    );

    return withWhiteboardProjection({
      version: STUDENT_WORKSPACE_STORAGE_VERSION,
      workspaceId: STUDENT_WORKSPACE_ID,
      notes,
      whiteboard: selectedWhiteboard?.scene || legacyWhiteboard,
      whiteboards,
      activeWhiteboardId: selectedWhiteboardId,
      graphs,
      queuedGraphForWhiteboard: parseQueuedGraph(
        value.queuedGraphForWhiteboard,
        fallback.updatedAt
      ),
      updatedAt: validTimestamp(value.updatedAt)
        ? value.updatedAt
        : fallback.updatedAt,
    });
  } catch {
    return fallback;
  }
}

export function getStudentWorkspaceStorageKey(userId: string) {
  const normalized = userId.trim();
  if (!normalized) throw new Error("A user id is required for workspace storage");
  return `${STORAGE_NAMESPACE}:${encodeURIComponent(normalized)}`;
}

function resolveBrowserStorage(): WorkspaceStorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function defaultId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function dispatchBrowserChange(detail: WorkspaceStorageEventDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<WorkspaceStorageEventDetail>(WORKSPACE_STORAGE_EVENT, {
      detail,
    })
  );
}

export function createWorkspaceStorageRepository(
  userId: string,
  options: WorkspaceStorageRepositoryOptions = {}
): WorkspaceStorageRepository {
  const storageKey = getStudentWorkspaceStorageKey(userId);
  const storage =
    options.storage === undefined ? resolveBrowserStorage() : options.storage;
  const now = () => dateToIso((options.now || (() => new Date()))());
  const createId = options.createId || defaultId;
  const notify = options.notify || dispatchBrowserChange;

  function read() {
    if (!storage) return createInitialStudentWorkspaceSnapshot(now());
    try {
      return parseStudentWorkspaceSnapshot(storage.getItem(storageKey), now());
    } catch {
      return createInitialStudentWorkspaceSnapshot(now());
    }
  }

  function write(
    snapshot: StudentWorkspaceSnapshot,
    reason: WorkspaceStorageChangeReason
  ) {
    if (!storage) throw new WorkspaceStorageUnavailableError();
    const next = withWhiteboardProjection({ ...snapshot, updatedAt: now() });
    try {
      const storedVersion = parsedStorageVersion(storage.getItem(storageKey));
      if (
        storedVersion !== null &&
        storedVersion > STUDENT_WORKSPACE_STORAGE_VERSION
      ) {
        throw new WorkspaceStorageVersionError(storedVersion);
      }
      storage.setItem(
        storageKey,
        JSON.stringify({ ...next, whiteboard: undefined })
      );
    } catch (error) {
      if (error instanceof WorkspaceStorageVersionError) throw error;
      throw new WorkspaceStorageWriteError(error);
    }
    notify({ userId, storageKey, reason });
    return next;
  }

  function normalizedNoteInput(input: CreateWorkspaceNoteInput = {}) {
    return {
      title: safeTitle(input.title, DEFAULT_NOTE_TITLE),
      content: safeText(input.content),
      icon: safeText(input.icon, "📝", 16) || "📝",
      favorite: input.favorite === true,
    };
  }

  return {
    getSnapshot: read,
    listNotes() {
      return read().notes.slice().sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt)
      );
    },
    getNote(id) {
      return read().notes.find((note) => note.id === id) || null;
    },
    createNote(input = {}) {
      const snapshot = read();
      const timestamp = now();
      let id = createId();
      while (snapshot.notes.some((note) => note.id === id)) id = createId();
      const note: WorkspaceNote = {
        id,
        ...normalizedNoteInput(input),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      write(
        { ...snapshot, notes: [note, ...snapshot.notes] },
        "note-created"
      );
      return note;
    },
    updateNote(id, patch) {
      const snapshot = read();
      const existing = snapshot.notes.find((note) => note.id === id);
      if (!existing) return null;
      const note: WorkspaceNote = {
        ...existing,
        ...(patch.title === undefined
          ? {}
          : { title: safeTitle(patch.title, DEFAULT_NOTE_TITLE) }),
        ...(patch.content === undefined
          ? {}
          : { content: safeText(patch.content) }),
        ...(patch.icon === undefined
          ? {}
          : { icon: safeText(patch.icon, "📝", 16) || "📝" }),
        ...(patch.favorite === undefined
          ? {}
          : { favorite: patch.favorite === true }),
        updatedAt: now(),
      };
      write(
        {
          ...snapshot,
          notes: snapshot.notes.map((item) => (item.id === id ? note : item)),
        },
        "note-updated"
      );
      return note;
    },
    deleteNote(id) {
      const snapshot = read();
      if (!snapshot.notes.some((note) => note.id === id)) return false;
      write(
        {
          ...snapshot,
          notes: snapshot.notes.filter((note) => note.id !== id),
        },
        "note-deleted"
      );
      return true;
    },
    listWhiteboards() {
      return sortWhiteboards(read().whiteboards);
    },
    getWhiteboardDocument(id) {
      return (
        read().whiteboards.find((document) => document.id === id) || null
      );
    },
    createWhiteboard(input = {}) {
      const snapshot = read();
      const timestamp = now();
      let id = createId();
      while (snapshot.whiteboards.some((document) => document.id === id)) {
        id = createId();
      }
      const document: WorkspaceWhiteboardDocument = {
        id,
        title: safeTitle(input.title, DEFAULT_WHITEBOARD_TITLE),
        createdAt: timestamp,
        updatedAt: timestamp,
        scene: createEmptyWhiteboardScene(timestamp),
      };
      write(
        {
          ...snapshot,
          whiteboards: [document, ...snapshot.whiteboards],
          activeWhiteboardId: document.id,
          whiteboard: document.scene,
        },
        "whiteboard-created"
      );
      return document;
    },
    updateWhiteboard(id, patch) {
      const snapshot = read();
      const existing = snapshot.whiteboards.find(
        (document) => document.id === id
      );
      if (!existing) return null;
      if (patch.title === undefined && patch.scene === undefined) {
        return existing;
      }
      const timestamp = now();
      const scene =
        patch.scene === undefined
          ? existing.scene
          : parseWhiteboard(patch.scene, timestamp) ||
            createEmptyWhiteboardScene(timestamp);
      const document: WorkspaceWhiteboardDocument = {
        ...existing,
        ...(patch.title === undefined
          ? {}
          : { title: safeTitle(patch.title, DEFAULT_WHITEBOARD_TITLE) }),
        scene,
        updatedAt:
          patch.scene === undefined ? timestamp : scene.updatedAt,
      };
      write(
        {
          ...snapshot,
          whiteboards: snapshot.whiteboards.map((item) =>
            item.id === id ? document : item
          ),
        },
        "whiteboard-updated"
      );
      return document;
    },
    deleteWhiteboard(id) {
      const snapshot = read();
      if (!snapshot.whiteboards.some((document) => document.id === id)) {
        return false;
      }
      const timestamp = now();
      const remaining = snapshot.whiteboards.filter(
        (document) => document.id !== id
      );
      let whiteboards = remaining;
      if (!whiteboards.length) {
        let replacementId = createId();
        while (
          snapshot.whiteboards.some(
            (document) => document.id === replacementId
          )
        ) {
          replacementId = createId();
        }
        whiteboards = [
          {
            ...createDefaultWhiteboardDocument(timestamp),
            id: replacementId,
          },
        ];
      }
      const selectedId = activeWhiteboardId(
        whiteboards,
        snapshot.activeWhiteboardId === id
          ? null
          : snapshot.activeWhiteboardId
      );
      write(
        {
          ...snapshot,
          whiteboards,
          activeWhiteboardId: selectedId,
        },
        "whiteboard-deleted"
      );
      return true;
    },
    getActiveWhiteboardId() {
      return read().activeWhiteboardId;
    },
    setActiveWhiteboardId(id) {
      const snapshot = read();
      const document = snapshot.whiteboards.find((item) => item.id === id);
      if (!document) return null;
      if (snapshot.activeWhiteboardId === id) return id;
      write(
        {
          ...snapshot,
          activeWhiteboardId: id,
          whiteboard: document.scene,
        },
        "whiteboard-active-changed"
      );
      return id;
    },
    getWhiteboard() {
      const snapshot = read();
      return (
        snapshot.whiteboards.find(
          (document) => document.id === snapshot.activeWhiteboardId
        )?.scene || null
      );
    },
    saveWhiteboard(scene) {
      const snapshot = read();
      const timestamp = validTimestamp(scene.updatedAt) ? scene.updatedAt : now();
      const whiteboard =
        parseWhiteboard(scene, timestamp) || createEmptyWhiteboardScene(timestamp);
      const activeId = snapshot.activeWhiteboardId;
      write(
        {
          ...snapshot,
          whiteboard,
          whiteboards: snapshot.whiteboards.map((document) =>
            document.id === activeId
              ? { ...document, scene: whiteboard, updatedAt: timestamp }
              : document
          ),
        },
        "whiteboard-saved"
      );
      return whiteboard;
    },
    listGraphs() {
      return read().graphs.slice().sort((left, right) =>
        right.updatedAt.localeCompare(left.updatedAt)
      );
    },
    getGraph(id) {
      return read().graphs.find((graph) => graph.id === id) || null;
    },
    saveGraph(input) {
      const snapshot = read();
      const id = validId(input.id) ? input.id : createId();
      const existing = snapshot.graphs.find((graph) => graph.id === id);
      const fallbackNow = now();
      const graph = parseGraph(
        {
          ...existing,
          ...input,
          id,
          createdAt:
            existing?.createdAt ||
            (validTimestamp(input.createdAt) ? input.createdAt : fallbackNow),
          updatedAt: validTimestamp(input.updatedAt)
            ? input.updatedAt
            : fallbackNow,
        },
        fallbackNow
      );
      if (!graph) throw new Error("Invalid graph");
      write(
        {
          ...snapshot,
          graphs: existing
            ? snapshot.graphs.map((item) => (item.id === id ? graph : item))
            : [graph, ...snapshot.graphs],
        },
        "graph-saved"
      );
      return graph;
    },
    deleteGraph(id) {
      const snapshot = read();
      if (!snapshot.graphs.some((graph) => graph.id === id)) return false;
      write(
        {
          ...snapshot,
          graphs: snapshot.graphs.filter((graph) => graph.id !== id),
        },
        "graph-deleted"
      );
      return true;
    },
    queueGraphForWhiteboard(input) {
      const snapshot = read();
      const fallbackNow = now();
      const payload = parseQueuedGraph(
        {
          ...input,
          id: validId(input.id) ? input.id : createId(),
          createdAt: validTimestamp(input.createdAt)
            ? input.createdAt
            : fallbackNow,
        },
        fallbackNow
      );
      if (!payload) throw new Error("Invalid graph payload");
      write(
        { ...snapshot, queuedGraphForWhiteboard: payload },
        "graph-queued"
      );
      return payload;
    },
    getQueuedGraphForWhiteboard() {
      return read().queuedGraphForWhiteboard;
    },
    consumeGraphForWhiteboard() {
      const snapshot = read();
      const payload = snapshot.queuedGraphForWhiteboard;
      if (!payload) return null;
      write(
        { ...snapshot, queuedGraphForWhiteboard: null },
        "graph-consumed"
      );
      return payload;
    },
    reset() {
      if (!storage) throw new WorkspaceStorageUnavailableError();
      try {
        storage.removeItem(storageKey);
      } catch (error) {
        throw new WorkspaceStorageWriteError(error);
      }
      notify({ userId, storageKey, reason: "reset" });
    },
  };
}

/**
 * The convenience API below is synchronous and browser-only for writes. Reads
 * are SSR-safe and return the seeded snapshot when localStorage is unavailable.
 */
export function listNotes(userId: string) {
  return createWorkspaceStorageRepository(userId).listNotes();
}

export function getNote(userId: string, id: string) {
  return createWorkspaceStorageRepository(userId).getNote(id);
}

export function createNote(userId: string, input?: CreateWorkspaceNoteInput) {
  return createWorkspaceStorageRepository(userId).createNote(input);
}

export function updateNote(
  userId: string,
  id: string,
  patch: UpdateWorkspaceNotePatch
) {
  return createWorkspaceStorageRepository(userId).updateNote(id, patch);
}

export function deleteNote(userId: string, id: string) {
  return createWorkspaceStorageRepository(userId).deleteNote(id);
}

export function listWhiteboards(userId: string) {
  return createWorkspaceStorageRepository(userId).listWhiteboards();
}

export function getWhiteboardDocument(userId: string, id: string) {
  return createWorkspaceStorageRepository(userId).getWhiteboardDocument(id);
}

export function createWhiteboard(
  userId: string,
  input?: CreateWorkspaceWhiteboardInput
) {
  return createWorkspaceStorageRepository(userId).createWhiteboard(input);
}

export function updateWhiteboard(
  userId: string,
  id: string,
  patch: UpdateWorkspaceWhiteboardPatch
) {
  return createWorkspaceStorageRepository(userId).updateWhiteboard(id, patch);
}

export function deleteWhiteboard(userId: string, id: string) {
  return createWorkspaceStorageRepository(userId).deleteWhiteboard(id);
}

export function getActiveWhiteboardId(userId: string) {
  return createWorkspaceStorageRepository(userId).getActiveWhiteboardId();
}

export function setActiveWhiteboardId(userId: string, id: string) {
  return createWorkspaceStorageRepository(userId).setActiveWhiteboardId(id);
}

/** @deprecated Use getWhiteboardDocument with getActiveWhiteboardId. */
export function getWhiteboard(userId: string) {
  return createWorkspaceStorageRepository(userId).getWhiteboard();
}

/** @deprecated Use updateWhiteboard with getActiveWhiteboardId. */
export function saveWhiteboard(
  userId: string,
  scene: WorkspaceWhiteboardScene
) {
  return createWorkspaceStorageRepository(userId).saveWhiteboard(scene);
}

export function listGraphs(userId: string) {
  return createWorkspaceStorageRepository(userId).listGraphs();
}

export function getGraph(userId: string, id: string) {
  return createWorkspaceStorageRepository(userId).getGraph(id);
}

export function saveGraph(userId: string, graph: WorkspaceGraphInput) {
  return createWorkspaceStorageRepository(userId).saveGraph(graph);
}

export function deleteGraph(userId: string, id: string) {
  return createWorkspaceStorageRepository(userId).deleteGraph(id);
}

export function queueGraphForWhiteboard(
  userId: string,
  payload: GraphWhiteboardPayloadInput
) {
  return createWorkspaceStorageRepository(userId).queueGraphForWhiteboard(
    payload
  );
}

export function consumeGraphForWhiteboard(userId: string) {
  return createWorkspaceStorageRepository(userId).consumeGraphForWhiteboard();
}

export function getQueuedGraphForWhiteboard(userId: string) {
  return createWorkspaceStorageRepository(userId).getQueuedGraphForWhiteboard();
}

export const consumeQueuedGraphForWhiteboard = consumeGraphForWhiteboard;

export function subscribeWorkspaceStorage(
  userId: string,
  listener: (detail: WorkspaceStorageEventDetail) => void
) {
  if (typeof window === "undefined") return () => undefined;
  const storageKey = getStudentWorkspaceStorageKey(userId);

  function onCustomEvent(event: Event) {
    const detail = (event as CustomEvent<WorkspaceStorageEventDetail>).detail;
    if (detail?.userId === userId) listener(detail);
  }

  function onStorage(event: StorageEvent) {
    if (event.key !== storageKey) return;
    listener({ userId, storageKey, reason: "storage" });
  }

  window.addEventListener(WORKSPACE_STORAGE_EVENT, onCustomEvent);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(WORKSPACE_STORAGE_EVENT, onCustomEvent);
    window.removeEventListener("storage", onStorage);
  };
}

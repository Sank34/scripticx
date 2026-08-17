import { describe, expect, it } from "vitest";

import {
  DEFAULT_WHITEBOARD_ID,
  STUDENT_WORKSPACE_STORAGE_VERSION,
  WorkspaceStorageUnavailableError,
  WorkspaceStorageVersionError,
  createInitialStudentWorkspaceSnapshot,
  createWelcomeNote,
  createWorkspaceStorageRepository,
  getStudentWorkspaceStorageKey,
  hasPristineWelcomeNotePayload,
  listNotes,
  parseStudentWorkspaceSnapshot,
  type WorkspaceStorageLike,
  type WorkspaceStorageChangeReason,
  type WorkspaceStorageEventDetail,
} from "@/lib/workspace-storage";
import { STUDENT_WORKSPACE_ID } from "@/lib/workspaces";

class MemoryStorage implements WorkspaceStorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }

  removeItem(key: string) {
    this.values.delete(key);
  }
}

function createHarness() {
  const storage = new MemoryStorage();
  let timestamp = "2026-08-11T08:00:00.000Z";
  let sequence = 0;
  const reasons: WorkspaceStorageChangeReason[] = [];
  const events: WorkspaceStorageEventDetail[] = [];
  const repository = createWorkspaceStorageRepository("user-1", {
    storage,
    now: () => new Date(timestamp),
    createId: () => `generated-${++sequence}`,
    notify: (detail) => {
      reasons.push(detail.reason);
      events.push(detail);
    },
  });

  return {
    repository,
    events,
    reasons,
    setTimestamp(value: string) {
      timestamp = value;
    },
    storage,
  };
}

describe("student workspace snapshot parsing", () => {
  it("starts a new workspace with an empty notes collection", () => {
    const snapshot = createInitialStudentWorkspaceSnapshot(
      "2026-08-11T08:00:00.000Z"
    );
    expect(snapshot.version).toBe(STUDENT_WORKSPACE_STORAGE_VERSION);
    expect(snapshot.workspaceId).toBe(STUDENT_WORKSPACE_ID);
    expect(snapshot.notes).toEqual([]);
    expect(snapshot.whiteboards).toHaveLength(1);
    expect(snapshot.activeWhiteboardId).toBe(DEFAULT_WHITEBOARD_ID);
    expect(snapshot.whiteboards[0]).toMatchObject({
      id: DEFAULT_WHITEBOARD_ID,
      title: "Whiteboard",
      scene: { elements: [], appState: {}, files: {} },
    });
    expect(snapshot.whiteboard).toEqual(snapshot.whiteboards[0].scene);
  });

  it("falls back safely for corrupt or future-version data", () => {
    expect(
      parseStudentWorkspaceSnapshot("not-json", "2026-08-11T08:00:00.000Z")
        .notes
    ).toEqual([]);
    expect(
      parseStudentWorkspaceSnapshot(
        JSON.stringify({
          version: 99,
          workspaceId: STUDENT_WORKSPACE_ID,
          notes: [],
        }),
        "2026-08-11T08:00:00.000Z"
      ).notes
    ).toEqual([]);
  });

  it("removes only the untouched legacy welcome seed", () => {
    const timestamp = "2026-08-11T08:00:00.000Z";
    const legacySeed = {
      id: "student-workspace-welcome",
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
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const similarRealNote = {
      ...legacySeed,
      id: "real-note-with-similar-title",
      content: "# Bine ai venit\nConținutul meu real.",
    };

    const migrated = parseStudentWorkspaceSnapshot(
      JSON.stringify({
        version: STUDENT_WORKSPACE_STORAGE_VERSION,
        workspaceId: STUDENT_WORKSPACE_ID,
        notes: [legacySeed, similarRealNote],
        graphs: [],
        whiteboards: [],
        queuedGraphForWhiteboard: null,
        updatedAt: timestamp,
      }),
      timestamp
    );
    expect(migrated.notes).toEqual([similarRealNote]);
    expect(
      hasPristineWelcomeNotePayload({
        ...createWelcomeNote(timestamp),
        id: "b19c5927-84a2-48e6-b1b6-0ea56a35288c",
      })
    ).toBe(true);

    const editedFormerSeed = {
      ...legacySeed,
      content: `${legacySeed.content}\n\nNotița mea`,
      updatedAt: "2026-08-11T09:00:00.000Z",
    };
    const preserved = parseStudentWorkspaceSnapshot(
      JSON.stringify({
        version: STUDENT_WORKSPACE_STORAGE_VERSION,
        workspaceId: STUDENT_WORKSPACE_ID,
        notes: [editedFormerSeed],
        graphs: [],
        whiteboards: [],
        queuedGraphForWhiteboard: null,
        updatedAt: editedFormerSeed.updatedAt,
      }),
      timestamp
    );
    expect(preserved.notes).toEqual([editedFormerSeed]);
  });

  it("keeps valid records and discards malformed records", () => {
    const snapshot = parseStudentWorkspaceSnapshot(
      JSON.stringify({
        version: STUDENT_WORKSPACE_STORAGE_VERSION,
        workspaceId: STUDENT_WORKSPACE_ID,
        updatedAt: "2026-08-11T08:00:00.000Z",
        notes: [
          {
            id: "note-1",
            title: "Algorithms",
            content: "# BFS",
            createdAt: "2026-08-11T08:00:00.000Z",
            updatedAt: "2026-08-11T08:00:00.000Z",
          },
          { title: "missing id" },
        ],
        graphs: [],
        whiteboard: null,
        queuedGraphForWhiteboard: null,
      })
    );
    expect(snapshot.notes.map((note) => note.id)).toEqual(["note-1"]);
  });

  it("migrates the v1 singleton scene into the stable default document", () => {
    const snapshot = parseStudentWorkspaceSnapshot(
      JSON.stringify({
        version: 1,
        workspaceId: STUDENT_WORKSPACE_ID,
        notes: [],
        graphs: [],
        whiteboard: {
          elements: [{ id: "legacy-shape" }],
          appState: { viewBackgroundColor: "#fafafa" },
          files: {},
          updatedAt: "2026-08-10T15:00:00.000Z",
        },
        queuedGraphForWhiteboard: null,
        updatedAt: "2026-08-10T15:00:00.000Z",
      }),
      "2026-08-11T08:00:00.000Z"
    );

    expect(snapshot.version).toBe(STUDENT_WORKSPACE_STORAGE_VERSION);
    expect(snapshot.activeWhiteboardId).toBe(DEFAULT_WHITEBOARD_ID);
    expect(snapshot.whiteboards).toHaveLength(1);
    expect(snapshot.whiteboards[0].scene).toMatchObject({
      elements: [{ id: "legacy-shape" }],
      updatedAt: "2026-08-10T15:00:00.000Z",
    });
  });
});

describe("workspace local repository", () => {
  it("creates, updates, lists, and deletes markdown notes", () => {
    const harness = createHarness();

    const created = harness.repository.createNote({
      title: "  Grafuri  ",
      content: "# Reprezentări",
    });
    expect(created).toMatchObject({
      id: "generated-1",
      title: "Grafuri",
      content: "# Reprezentări",
      createdAt: "2026-08-11T08:00:00.000Z",
    });

    harness.setTimestamp("2026-08-11T09:00:00.000Z");
    const updated = harness.repository.updateNote(created.id, {
      content: "# Liste de adiacență",
      favorite: true,
      icon: "🧠",
    });
    expect(updated?.createdAt).toBe(created.createdAt);
    expect(updated?.updatedAt).toBe("2026-08-11T09:00:00.000Z");
    expect(updated).toMatchObject({ favorite: true, icon: "🧠" });
    expect(harness.repository.listNotes()).toHaveLength(1);
    expect(harness.repository.deleteNote(created.id)).toBe(true);
    expect(harness.repository.listNotes()).toEqual([]);
    expect(harness.reasons).toEqual([
      "note-created",
      "note-updated",
      "note-deleted",
    ]);
    expect(harness.events[0]).toMatchObject({
      reason: "note-created",
      entityId: "generated-1",
    });
  });

  it("hydrates cloud documents without overwriting local graph data", () => {
    const harness = createHarness();
    harness.repository.saveGraph({ id: "graph-1", title: "Local graph" });
    const snapshot = harness.repository.hydrateCloudDocuments({
      notes: [
        {
          id: "b19c5927-84a2-48e6-b1b6-0ea56a35288c",
          title: "Cloud note",
          content: "# Synced",
          icon: "📝",
          favorite: true,
          createdAt: "2026-08-17T08:00:00.000Z",
          updatedAt: "2026-08-17T09:00:00.000Z",
        },
      ],
      whiteboards: [
        {
          id: "e0654a07-ff31-462a-ab92-901ec88e84f8",
          title: "Cloud board",
          createdAt: "2026-08-17T08:00:00.000Z",
          updatedAt: "2026-08-17T09:00:00.000Z",
          scene: {
            elements: [{ id: "shape-1" }],
            appState: {},
            files: {},
            updatedAt: "2026-08-17T09:00:00.000Z",
          },
        },
      ],
      activeWhiteboardId: "e0654a07-ff31-462a-ab92-901ec88e84f8",
    });

    expect(snapshot.notes[0].title).toBe("Cloud note");
    expect(snapshot.whiteboards[0].title).toBe("Cloud board");
    expect(snapshot.graphs[0].id).toBe("graph-1");
    expect(harness.reasons.at(-1)).toBe("cloud-synced");
  });

  it("keeps the legacy scene API mapped to the active whiteboard", () => {
    const { repository } = createHarness();
    expect(repository.getWhiteboard()).toMatchObject({ elements: [] });
    const scene = repository.saveWhiteboard({
      elements: [{ id: "shape-1", type: "rectangle" }],
      appState: { viewBackgroundColor: "#ffffff" },
      files: {},
      updatedAt: "2026-08-11T08:30:00.000Z",
    });
    expect(scene.updatedAt).toBe("2026-08-11T08:30:00.000Z");
    expect(repository.getWhiteboard()).toEqual(scene);
    expect(
      repository.getWhiteboardDocument(DEFAULT_WHITEBOARD_ID)?.scene
    ).toEqual(scene);
  });

  it("creates, updates, lists, and deletes whiteboard documents", () => {
    const harness = createHarness();
    expect(harness.repository.listWhiteboards().map((item) => item.id)).toEqual([
      DEFAULT_WHITEBOARD_ID,
    ]);

    harness.setTimestamp("2026-08-11T09:00:00.000Z");
    const created = harness.repository.createWhiteboard({
      title: "  Grafuri pentru test  ",
    });
    expect(created).toMatchObject({
      id: "generated-1",
      title: "Grafuri pentru test",
      createdAt: "2026-08-11T09:00:00.000Z",
      scene: { elements: [] },
    });
    expect(harness.repository.getActiveWhiteboardId()).toBe(created.id);

    harness.setTimestamp("2026-08-11T10:00:00.000Z");
    const updated = harness.repository.updateWhiteboard(created.id, {
      title: "Grafuri actualizate",
      scene: {
        elements: [{ id: "node-1" }],
        appState: {},
        files: {},
        updatedAt: "2026-08-11T10:00:00.000Z",
      },
    });
    expect(updated).toMatchObject({
      id: created.id,
      title: "Grafuri actualizate",
      createdAt: created.createdAt,
      updatedAt: "2026-08-11T10:00:00.000Z",
      scene: { elements: [{ id: "node-1" }] },
    });
    expect(harness.repository.listWhiteboards()[0].id).toBe(created.id);

    expect(harness.repository.deleteWhiteboard(created.id)).toBe(true);
    expect(harness.repository.getActiveWhiteboardId()).toBe(
      DEFAULT_WHITEBOARD_ID
    );
    expect(harness.repository.deleteWhiteboard(DEFAULT_WHITEBOARD_ID)).toBe(
      true
    );
    expect(harness.repository.listWhiteboards()).toHaveLength(1);
    expect(harness.repository.getActiveWhiteboardId()).toBe("generated-2");
    expect(
      harness.repository.getWhiteboardDocument(DEFAULT_WHITEBOARD_ID)
    ).toBeNull();
    expect(
      harness.repository.getWhiteboardDocument("generated-2")
    ).toMatchObject({
      title: "Whiteboard",
      scene: { elements: [] },
    });
    expect(harness.reasons).toEqual([
      "whiteboard-created",
      "whiteboard-updated",
      "whiteboard-deleted",
      "whiteboard-deleted",
    ]);
  });

  it("switches active documents and falls back to the latest remaining one", () => {
    const harness = createHarness();
    harness.setTimestamp("2026-08-11T09:00:00.000Z");
    const first = harness.repository.createWhiteboard({ title: "Prima" });
    harness.setTimestamp("2026-08-11T10:00:00.000Z");
    const second = harness.repository.createWhiteboard({ title: "A doua" });

    expect(harness.repository.setActiveWhiteboardId(first.id)).toBe(first.id);
    expect(harness.repository.getActiveWhiteboardId()).toBe(first.id);
    expect(harness.repository.setActiveWhiteboardId("missing")).toBeNull();

    expect(harness.repository.deleteWhiteboard(first.id)).toBe(true);
    expect(harness.repository.getActiveWhiteboardId()).toBe(second.id);
    expect(harness.repository.getWhiteboardDocument(first.id)).toBeNull();
  });

  it("upserts graph-agent data without changing creation time", () => {
    const harness = createHarness();
    const graph = harness.repository.saveGraph({
      id: "graph-1",
      title: "Arbore",
      directed: false,
      indexMode: "zero",
      nodeCount: 2,
      customLabels: ["A", "B"],
      source: "0 1",
      nodes: [
        { id: "0", label: "A", position: { x: 10, y: 20 } },
        { id: "1", label: "B" },
      ],
      edges: [{ id: "edge-1", source: "0", target: "1" }],
      updatedAt: "2026-08-11T08:00:00.000Z",
    });
    expect(graph.createdAt).toBe("2026-08-11T08:00:00.000Z");

    harness.setTimestamp("2026-08-11T09:00:00.000Z");
    const updated = harness.repository.saveGraph({
      ...graph,
      title: "Arbore actualizat",
      updatedAt: "2026-08-11T09:00:00.000Z",
    });
    expect(updated.createdAt).toBe(graph.createdAt);
    expect(harness.repository.listGraphs()).toHaveLength(1);
    expect(harness.repository.getGraph("graph-1")?.title).toBe(
      "Arbore actualizat"
    );
  });

  it("queues one graph for whiteboard and consumes it once", () => {
    const { repository } = createHarness();
    const queued = repository.queueGraphForWhiteboard({
      id: "graph-1",
      title: "Graf pentru tablă",
      nodes: [{ id: "0", label: "0" }],
      edges: [],
      directed: true,
      createdAt: "2026-08-11T08:00:00.000Z",
    });
    expect(repository.getQueuedGraphForWhiteboard()).toEqual(queued);
    expect(repository.consumeGraphForWhiteboard()).toEqual(queued);
    expect(repository.getQueuedGraphForWhiteboard()).toBeNull();
    expect(repository.consumeGraphForWhiteboard()).toBeNull();
  });

  it("persists a v1 scene as v2 on the first document write", () => {
    const storage = new MemoryStorage();
    const storageKey = getStudentWorkspaceStorageKey("legacy-user");
    storage.setItem(
      storageKey,
      JSON.stringify({
        version: 1,
        workspaceId: STUDENT_WORKSPACE_ID,
        notes: [],
        graphs: [],
        whiteboard: {
          elements: [{ id: "legacy-shape" }],
          appState: {},
          files: {},
          updatedAt: "2026-08-10T15:00:00.000Z",
        },
        queuedGraphForWhiteboard: null,
        updatedAt: "2026-08-10T15:00:00.000Z",
      })
    );
    const repository = createWorkspaceStorageRepository("legacy-user", {
      storage,
      now: () => new Date("2026-08-11T08:00:00.000Z"),
    });

    expect(repository.listWhiteboards()[0].scene.elements).toEqual([
      { id: "legacy-shape" },
    ]);
    expect(JSON.parse(storage.getItem(storageKey) || "{}").version).toBe(1);

    repository.updateWhiteboard(DEFAULT_WHITEBOARD_ID, {
      title: "Tabla migrată",
    });
    const persisted = JSON.parse(storage.getItem(storageKey) || "{}");
    expect(persisted.version).toBe(STUDENT_WORKSPACE_STORAGE_VERSION);
    expect(persisted.whiteboard).toBeUndefined();
    expect(persisted.whiteboards[0]).toMatchObject({
      id: DEFAULT_WHITEBOARD_ID,
      title: "Tabla migrată",
      scene: { elements: [{ id: "legacy-shape" }] },
    });
  });

  it("refuses to overwrite a newer storage envelope", () => {
    const storage = new MemoryStorage();
    const storageKey = getStudentWorkspaceStorageKey("future-user");
    const raw = JSON.stringify({
      version: STUDENT_WORKSPACE_STORAGE_VERSION + 1,
      workspaceId: STUDENT_WORKSPACE_ID,
      futureData: { keep: true },
    });
    storage.setItem(storageKey, raw);
    const repository = createWorkspaceStorageRepository("future-user", {
      storage,
    });

    expect(() => repository.createWhiteboard()).toThrow(
      WorkspaceStorageVersionError
    );
    expect(storage.getItem(storageKey)).toBe(raw);
  });
});

describe("browser convenience API", () => {
  it("scopes keys by user id", () => {
    expect(getStudentWorkspaceStorageKey("user/a")).not.toBe(
      getStudentWorkspaceStorageKey("user/b")
    );
  });

  it("keeps reads SSR-safe and fails writes explicitly without localStorage", () => {
    expect(listNotes("server-user")).toEqual([]);
    const repository = createWorkspaceStorageRepository("server-user", {
      storage: null,
    });
    expect(() => repository.createNote()).toThrow(
      WorkspaceStorageUnavailableError
    );
  });
});

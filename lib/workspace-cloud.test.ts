import { beforeEach, describe, expect, it, vi } from "vitest";

const { existingRows, supabaseMock, writes } = vi.hoisted(() => {
  type WorkspaceTable = "workspace_notes" | "workspace_whiteboards";
  type Write = {
    method: "insert" | "update";
    payload: Record<string, unknown>;
    table: WorkspaceTable;
  };

  const workspaceId = "fd861a2b-638e-4bb5-8337-6f6edca86190";
  const existingRows: Record<WorkspaceTable, boolean> = {
    workspace_notes: false,
    workspace_whiteboards: false,
  };
  const writes: Write[] = [];

  const supabaseMock = {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let payload: Record<string, unknown> = {};
      let method: Write["method"] | null = null;

      const builder = {
        eq(column: string, value: unknown) {
          filters[column] = value;
          return builder;
        },
        insert(value: Record<string, unknown>) {
          method = "insert";
          payload = value;
          writes.push({
            method,
            payload: { ...value },
            table: table as WorkspaceTable,
          });
          return builder;
        },
        limit() {
          return builder;
        },
        async maybeSingle() {
          if (table === "workspaces") {
            return { data: { id: workspaceId }, error: null };
          }
          return {
            data: existingRows[table as WorkspaceTable]
              ? { id: filters.id }
              : null,
            error: null,
          };
        },
        order() {
          return builder;
        },
        select() {
          return builder;
        },
        async single() {
          const timestamp = "2026-08-17T08:30:00.000Z";
          return {
            data: {
              id: payload.id || filters.id,
              workspace_id: workspaceId,
              created_by: filters.created_by,
              created_at: timestamp,
              updated_at: timestamp,
              ...payload,
            },
            error: method ? null : { message: "Missing write operation" },
          };
        },
        update(value: Record<string, unknown>) {
          method = "update";
          payload = value;
          writes.push({
            method,
            payload: { ...value },
            table: table as WorkspaceTable,
          });
          return builder;
        },
      };

      return builder;
    },
  };

  return { existingRows, supabaseMock, writes };
});

vi.mock("@/lib/supabase", () => ({ supabase: supabaseMock }));

import {
  didWorkspaceStorageChange,
  isPristineDefaultWhiteboard,
  isPristineWelcomeNote,
  isWorkspaceCloudUuid,
  newerWorkspaceDocument,
  persistWorkspaceNote,
  persistWorkspaceWhiteboard,
  remoteWorkspaceDeletionId,
  shouldRestoreLocalWorkspaceDocument,
} from "@/lib/workspace-cloud";
import {
  createInitialStudentWorkspaceSnapshot,
  createWelcomeNote,
} from "@/lib/workspace-storage";

describe("workspace cloud reconciliation", () => {
  beforeEach(() => {
    existingRows.workspace_notes = false;
    existingRows.workspace_whiteboards = false;
    writes.length = 0;
  });

  it("accepts database UUIDs and rejects legacy local identifiers", () => {
    expect(
      isWorkspaceCloudUuid("846f3427-1084-4ed1-bb8a-23d8f947c786")
    ).toBe(true);
    expect(isWorkspaceCloudUuid("student-workspace-welcome")).toBe(false);
  });

  it("does not send legacy seed ids to UUID delete filters", () => {
    const remoteId = "846f3427-1084-4ed1-bb8a-23d8f947c786";
    expect(remoteWorkspaceDeletionId("student-workspace-welcome", {})).toBeNull();
    expect(
      remoteWorkspaceDeletionId("student-workspace-welcome", {
        "student-workspace-welcome": remoteId,
      })
    ).toBe(remoteId);
  });

  it("uses the newest document and lets remote win exact timestamp ties", () => {
    const local = { updatedAt: "2026-08-17T08:01:00.000Z", value: "local" };
    const remote = { updatedAt: "2026-08-17T08:00:00.000Z", value: "remote" };
    expect(newerWorkspaceDocument(local, remote)).toBe(local);
    expect(
      newerWorkspaceDocument(
        { ...local, updatedAt: remote.updatedAt },
        remote
      )
    ).toBe(remote);
  });

  it("does not resurrect a known remote deletion unless it was edited offline", () => {
    const lastSync = "2026-08-17T08:00:00.000Z";
    expect(
      shouldRestoreLocalWorkspaceDocument(
        "2026-08-17T07:59:00.000Z",
        true,
        lastSync
      )
    ).toBe(false);
    expect(
      shouldRestoreLocalWorkspaceDocument(
        "2026-08-17T08:01:00.000Z",
        true,
        lastSync
      )
    ).toBe(true);
    expect(
      shouldRestoreLocalWorkspaceDocument(
        "2026-08-17T07:59:00.000Z",
        false,
        lastSync
      )
    ).toBe(true);
  });

  it("does not mistake two cold-cache fallbacks for a local edit", () => {
    expect(
      didWorkspaceStorageChange(
        null,
        null,
        "2026-08-17T08:00:00.000Z",
        "2026-08-17T08:00:01.000Z"
      )
    ).toBe(false);
    expect(
      didWorkspaceStorageChange(
        null,
        '{"notes":[{"id":"new"}]}',
        "2026-08-17T08:00:00.000Z",
        "2026-08-17T08:00:01.000Z"
      )
    ).toBe(true);
  });

  it("recognizes untouched local seed documents on a new device", () => {
    const timestamp = "2026-08-17T08:00:00.000Z";
    const snapshot = createInitialStudentWorkspaceSnapshot(timestamp);
    const welcome = createWelcomeNote(timestamp);
    expect(isPristineWelcomeNote(welcome)).toBe(true);
    expect(isPristineDefaultWhiteboard(snapshot.whiteboards[0])).toBe(true);
    expect(
      isPristineWelcomeNote({
        ...welcome,
        content: `${welcome.content}\nEdited`,
      })
    ).toBe(false);
    expect(
      isPristineDefaultWhiteboard({
        ...snapshot.whiteboards[0],
        scene: {
          ...snapshot.whiteboards[0].scene,
          elements: [{ id: "shape" }],
        },
      })
    ).toBe(false);
  });

  it("keeps immutable identity columns out of authenticated updates", async () => {
    const userId = "239cdcf0-b42c-4bf9-b753-ee61973bf4f7";
    const note = {
      id: "f34b87af-fe38-4890-946b-1296494446ad",
      title: "Algorithms",
      content: "# BFS",
      icon: "N",
      favorite: true,
      createdAt: "2026-08-17T08:00:00.000Z",
      updatedAt: "2026-08-17T08:05:00.000Z",
    };
    const whiteboard = {
      id: "be69fd69-d07d-4a0d-93d2-bfbc6575aff9",
      title: "Graph sketch",
      createdAt: "2026-08-17T08:00:00.000Z",
      updatedAt: "2026-08-17T08:05:00.000Z",
      scene: {
        elements: [{ id: "node-a" }],
        appState: { viewBackgroundColor: "#ffffff" },
        files: { image: { id: "image" } },
        updatedAt: "2026-08-17T08:05:00.000Z",
      },
    };

    await persistWorkspaceNote(userId, note);
    await persistWorkspaceWhiteboard(userId, whiteboard);

    expect(writes).toEqual([
      {
        method: "insert",
        table: "workspace_notes",
        payload: {
          id: note.id,
          workspace_id: "fd861a2b-638e-4bb5-8337-6f6edca86190",
          created_by: userId,
          title: note.title,
          content: note.content,
          icon: note.icon,
          favorite: note.favorite,
        },
      },
      {
        method: "insert",
        table: "workspace_whiteboards",
        payload: {
          id: whiteboard.id,
          workspace_id: "fd861a2b-638e-4bb5-8337-6f6edca86190",
          title: whiteboard.title,
          created_by: userId,
          updated_by: userId,
          elements: whiteboard.scene.elements,
          app_state: whiteboard.scene.appState,
          files: whiteboard.scene.files,
        },
      },
    ]);

    writes.length = 0;
    existingRows.workspace_notes = true;
    existingRows.workspace_whiteboards = true;

    await persistWorkspaceNote(userId, {
      ...note,
      content: "# DFS",
      updatedAt: "2026-08-17T08:10:00.000Z",
    });
    await persistWorkspaceWhiteboard(userId, {
      ...whiteboard,
      title: "Updated graph sketch",
      updatedAt: "2026-08-17T08:10:00.000Z",
    });

    expect(writes).toEqual([
      {
        method: "update",
        table: "workspace_notes",
        payload: {
          title: note.title,
          content: "# DFS",
          icon: note.icon,
          favorite: note.favorite,
        },
      },
      {
        method: "update",
        table: "workspace_whiteboards",
        payload: {
          title: "Updated graph sketch",
          updated_by: userId,
          elements: whiteboard.scene.elements,
          app_state: whiteboard.scene.appState,
          files: whiteboard.scene.files,
        },
      },
    ]);

    for (const write of writes) {
      expect(write.payload).not.toHaveProperty("id");
      expect(write.payload).not.toHaveProperty("workspace_id");
      expect(write.payload).not.toHaveProperty("created_by");
      expect(write.payload).not.toHaveProperty("created_at");
      expect(write.payload).not.toHaveProperty("updated_at");
    }
  });
});

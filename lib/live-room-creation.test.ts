import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProjectFile } from "./editor-project";
import { createLiveWorkspaceDocument, parseLiveWorkspace, serializeLiveWorkspace } from "./editor-live-workspace";

const db = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), select: vi.fn(), single: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: db.from } }));
import { api } from "./api";

describe("live room creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.from.mockReturnValue(db);
    db.insert.mockReturnValue(db);
    db.select.mockReturnValue(db);
  });

  it("makes the complete non-MiniScript workspace available in the room's initial insert", async () => {
    const workspace = createLiveWorkspaceDocument({ files: [createProjectFile("main.py", "print(42)")], directories: [], project: { projectId: "saved", ownerId: "owner" } });
    const code = serializeLiveWorkspace(workspace);
    db.single.mockResolvedValue({ data: { id: "room", code }, error: null });
    const room = await api.live.createRoom("owner", "Python", code);
    expect(db.from).toHaveBeenCalledExactlyOnceWith("live_rooms");
    expect(db.insert).toHaveBeenCalledExactlyOnceWith({ owner_id: "owner", name: "Python", status: "active", code });
    expect(parseLiveWorkspace(room.code)).toEqual(workspace);
  });

  it("propagates a failed insert without returning an empty room", async () => {
    db.single.mockResolvedValue({ data: null, error: new Error("Insert denied") });
    await expect(api.live.createRoom("owner", "Python", "workspace")).rejects.toThrow("Insert denied");
  });
});

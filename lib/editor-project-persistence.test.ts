import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  from: vi.fn(), update: vi.fn(), insert: vi.fn(), eq: vi.fn(), select: vi.fn(),
  maybeSingle: vi.fn(), single: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({ supabase: { from: db.from } }));
import { persistEditorProject } from "@/lib/editor-project-persistence";

const payload = { title: "Project", description: "", code: "PRINT 1", files: [], is_public: false };
beforeEach(() => {
  vi.resetAllMocks();
  for (const method of [db.from, db.update, db.insert, db.eq, db.select]) method.mockReturnValue(db);
  db.maybeSingle.mockResolvedValue({ data: { id: "connected-project" }, error: null });
  db.single.mockResolvedValue({ data: { id: "new-project" }, error: null });
});

describe("saving a GitHub-connected editor project", () => {
  it("uses the connected project ID even when the first-save callback still has no saved ID", async () => {
    const result = await persistEditorProject({ userId: "alice", savedId: null, projectIdOverride: "connected-project", payload });
    expect(result.id).toBe("connected-project");
    expect(db.eq).toHaveBeenCalledWith("id", "connected-project");
    expect(db.eq).toHaveBeenCalledWith("user_id", "alice");
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.from).toHaveBeenCalledExactlyOnceWith("snippets");
  });

  it("does not silently create an unlinked duplicate if the connected project no longer exists", async () => {
    db.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const result = await persistEditorProject({ userId: "alice", savedId: null, projectIdOverride: "connected-project", payload });
    expect(result.id).toBeNull();
    expect(result.error).toBeTruthy();
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("saves ordinary edits into the same project without touching its repository link", async () => {
    expect((await persistEditorProject({ userId: "alice", savedId: "connected-project", payload })).id).toBe("connected-project");
    expect(db.update).toHaveBeenCalledWith(payload);
    expect(db.from).toHaveBeenCalledExactlyOnceWith("snippets");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("can still save a new standalone project", async () => {
    expect((await persistEditorProject({ userId: "alice", savedId: null, payload })).id).toBe("new-project");
    expect(db.insert).toHaveBeenCalledWith([{ user_id: "alice", ...payload }]);
  });
});

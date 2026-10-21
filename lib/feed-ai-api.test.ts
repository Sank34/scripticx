import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ from: vi.fn(), insert: vi.fn(), select: vi.fn(), single: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: db }));
import { api } from "./api";

beforeEach(() => {
  vi.resetAllMocks();
  for (const fn of [db.from, db.insert, db.select]) fn.mockReturnValue(db);
  db.single.mockResolvedValue({ data: { id: "post", user_id: "author", content: "A post", is_ai_generated: true }, error: null });
});

describe("feed AI disclosure API", () => {
  it("persists the author's declaration when creating a post", async () => {
    const post = await api.feed.createPost({ userId: "author", content: "A post", isAiGenerated: true });
    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ is_ai_generated: true }));
    expect(db.select).toHaveBeenCalledWith(expect.stringContaining("is_ai_generated"));
    expect(post.is_ai_generated).toBe(true);
  });

  it("defaults to not declared for callers without the new option", async () => {
    await api.feed.createPost({ userId: "author", content: "A post" });
    expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({ is_ai_generated: false }));
  });

  it("saves both true and false through the restricted RPC", async () => {
    for (const checked of [true, false]) {
      db.rpc.mockResolvedValueOnce({ data: checked, error: null });
      expect(await api.feed.setAiGenerated("post", checked)).toBe(checked);
      expect(db.rpc).toHaveBeenLastCalledWith("set_post_ai_generated", { p_post_id: "post", p_is_ai_generated: checked });
    }
    expect(db.from).not.toHaveBeenCalled();
  });

  it("does not swallow persistence or permission errors", async () => {
    db.rpc.mockResolvedValueOnce({ data: null, error: { message: "Permission denied" } });
    await expect(api.feed.setAiGenerated("post", true)).rejects.toMatchObject({ message: "Permission denied" });
    db.rpc.mockResolvedValueOnce({ data: null, error: null });
    await expect(api.feed.setAiGenerated("post", true)).rejects.toThrow("not saved");
    db.single.mockResolvedValueOnce({ data: null, error: { message: "Column missing" } });
    await expect(api.feed.createPost({ userId: "author", content: "A post", isAiGenerated: true })).rejects.toMatchObject({ message: "Column missing" });
  });

  it("rejects non-boolean declarations before any write", async () => {
    await expect(api.feed.setAiGenerated("post", "false" as unknown as boolean)).rejects.toThrow("Invalid AI disclosure");
    await expect(api.feed.createPost({ userId: "author", content: "A post", isAiGenerated: null as unknown as boolean })).rejects.toThrow("Invalid AI disclosure");
    expect(db.from).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
  });
});

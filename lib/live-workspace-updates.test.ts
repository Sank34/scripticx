import { afterEach, describe, expect, it, vi } from "vitest";
import { createProjectFile } from "./editor-project";
import { createLiveWorkspaceDocument, serializeLiveWorkspace } from "./editor-live-workspace";
import { applyLiveFileUpdates, getLiveFileUpdates } from "./live-workspace-updates";
import { createLiveUpdateScheduler } from "./live-update-scheduler";

const workspace = () => createLiveWorkspaceDocument({
  files: [createProjectFile("main.py", "print(1)"), createProjectFile("utils.py", "# helpers"), createProjectFile("data.json", "x".repeat(100_000))],
  directories: [], project: { projectId: "saved", ownerId: "owner", github: { owner: "owner", repo: "repo", branch: "main" } },
});

afterEach(() => vi.useRealTimers());

describe("live workspace delivery", () => {
  it("delivers while typing continuously, then delivers the final character without another keystroke", () => {
    vi.useFakeTimers();
    let local = workspace();
    let sent = local;
    let remote = local;
    let messages = 0;
    const scheduler = createLiveUpdateScheduler(() => {
      const updates = getLiveFileUpdates(sent, local);
      sent = local;
      remote = applyLiveFileUpdates(remote, updates)!;
      messages++;
    });
    for (let index = 0; index < 100; index++) {
      local = { ...local, files: local.files.map((file, fileIndex) => fileIndex === 0 ? { ...file, content: file.content + "a" } : file) };
      scheduler.schedule();
      vi.advanceTimersByTime(10);
      if (index >= 4) expect(remote.files[0].content.length).toBeGreaterThan(8);
    }
    vi.advanceTimersByTime(50);
    expect(messages).toBe(20);
    expect(remote).toEqual(local);
  });

  it("coalesces cursor movement to the latest position and cancels delivery when leaving", () => {
    vi.useFakeTimers();
    let cursor = 0;
    const delivered: number[] = [];
    const scheduler = createLiveUpdateScheduler(() => delivered.push(cursor));
    for (cursor = 1; cursor <= 10; cursor++) scheduler.schedule();
    cursor = 10;
    vi.advanceTimersByTime(50);
    expect(delivered).toEqual([10]);
    scheduler.schedule();
    scheduler.cancel();
    vi.advanceTimersByTime(100);
    expect(delivered).toEqual([10]);
    cursor = 11;
    scheduler.schedule();
    vi.advanceTimersByTime(50);
    expect(delivered).toEqual([10, 11]);
  });

  it("flushes the last edit immediately before leaving, without a duplicate later", () => {
    vi.useFakeTimers();
    const deliver = vi.fn();
    const scheduler = createLiveUpdateScheduler(deliver);
    scheduler.schedule();
    scheduler.flush();
    expect(deliver).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    scheduler.flush();
    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it("sends only changed files, preserving unrelated edits, project identity, GitHub and active tab", () => {
    const before = workspace();
    const changed = { ...before, files: before.files.map((file, index) => index === 0 ? { ...file, content: "print(2)" } : file) };
    const updates = getLiveFileUpdates(before, changed)!;
    expect(updates).toEqual([{ id: before.files[0].id, path: "main.py", content: "print(2)" }]);
    expect(JSON.stringify(updates).length).toBeLessThan(serializeLiveWorkspace(changed).length / 100);
    const other = { ...before, activeFileId: before.files[1].id, files: before.files.map((file, index) => index === 1 ? { ...file, content: "# edited by peer" } : file) };
    const merged = applyLiveFileUpdates(other, updates)!;
    expect(merged.files.map(file => file.content)).toEqual(["print(2)", "# edited by peer", before.files[2].content]);
    expect(merged.files[1]).toBe(other.files[1]);
    expect(merged.project).toEqual(before.project);
    expect(merged.activeFileId).toBe(other.activeFileId);
  });

  it("uses a complete snapshot for structure or project metadata changes, but ignores tab switches", () => {
    const before = workspace();
    expect(getLiveFileUpdates(before, { ...before, files: before.files.slice(1) })).toBeNull();
    expect(getLiveFileUpdates(before, { ...before, files: before.files.map((file, index) => index === 0 ? { ...file, path: "renamed.py" } : file) })).toBeNull();
    expect(getLiveFileUpdates(before, { ...before, title: "new title" })).toBeNull();
    expect(getLiveFileUpdates(before, { ...before, project: null })).toBeNull();
    expect(getLiveFileUpdates(before, { ...before, activeFileId: before.files[1].id })).toEqual([]);
  });

  it("rejects updates for missing/renamed files and malformed or duplicate updates atomically", () => {
    const before = workspace();
    const valid = { id: before.files[0].id, path: "main.py", content: "changed" };
    for (const value of [null, {}, [], [valid, valid], [valid, { ...valid, id: "missing" }], [{ ...valid, path: "old.py" }], [{ ...valid, content: 42 }]]) {
      expect(applyLiveFileUpdates(before, value)).toBeNull();
    }
    expect(before.files[0].content).toBe("print(1)");
  });
});

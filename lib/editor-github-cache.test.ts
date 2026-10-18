import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/github-client", () => ({ githubClientRequest: vi.fn() }));
import { githubClientRequest } from "@/lib/github-client";
import { cacheEditorGitHubProjectLink, editorGitHubBranches, editorGitHubProjectLink, editorGitHubRepositories } from "@/lib/editor-github-cache";
import type { GitHubProjectLink } from "@/lib/github-integration";

const request = vi.mocked(githubClientRequest);
const client = new QueryClient();
const payload = { configured: true, installations: [], repositories: [], link: null };
const link: GitHubProjectLink = {
  owner: "alice", repo: "editor", installationId: 1, repositoryId: 2,
  branch: "feature/editor", defaultBranch: "main", headSha: "head", remoteHeadSha: "head",
  syncStatus: "clean", trackedPaths: ["main.msp"], fileHashes: { "main.msp": "hash" }, lastSyncedAt: null,
};

beforeEach(() => { request.mockReset(); request.mockResolvedValue(payload); });
afterEach(() => client.clear());

describe("editor GitHub cache", () => {
  it("reuses fresh data across panel mounts and clone dialog openings", async () => {
    const options = editorGitHubRepositories("alice");
    await client.fetchQuery(options);
    await client.fetchQuery(editorGitHubRepositories("alice"));
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("deduplicates simultaneous loads", async () => {
    const options = editorGitHubRepositories("alice", "project-1");
    await Promise.all([client.fetchQuery(options), client.fetchQuery(options)]);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("finishes an in-flight read after switching away and reuses it on return", async () => {
    let finish!: (result: typeof payload) => void;
    request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const options = editorGitHubRepositories("alice", "project-1");
    const observer = new QueryObserver(client, options);
    const unsubscribe = observer.subscribe(() => {});
    unsubscribe();
    finish(payload);
    await client.fetchQuery(options);
    expect(client.getQueryData(options.queryKey)).toEqual(payload);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("does not reuse a different account's or project's link", async () => {
    await client.fetchQuery(editorGitHubRepositories("alice", "project-1"));
    await client.fetchQuery(editorGitHubRepositories("alice", "project-2"));
    await client.fetchQuery(editorGitHubRepositories("bob", "project-1"));
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("refreshes invalidated data and retains the previous result on a failed refresh", async () => {
    const options = { ...editorGitHubRepositories("alice", "project-1"), retry: false };
    await client.fetchQuery(options);
    await client.invalidateQueries({ queryKey: options.queryKey });
    request.mockRejectedValueOnce(new Error("offline"));
    await expect(client.fetchQuery(options)).rejects.toThrow("offline");
    expect(client.getQueryData(options.queryKey)).toEqual(payload);
    await client.fetchQuery(options);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it("does not enable requests for guests or unconnected branches", () => {
    expect(editorGitHubRepositories(null).enabled).toBe(false);
    expect(editorGitHubBranches("alice", null, true).enabled).toBe(false);
    expect(editorGitHubBranches("alice", "project-1", false).enabled).toBe(false);
    expect(editorGitHubProjectLink(null, "project-1").enabled).toBe(false);
    expect(editorGitHubProjectLink("alice", null).enabled).toBe(false);
  });

  it("restores the persisted repository and current branch after losing the browser cache", async () => {
    request.mockResolvedValue({ link });
    const options = editorGitHubProjectLink("alice", "project-1");
    await client.fetchQuery(options);
    client.clear();
    expect(await client.fetchQuery(options)).toEqual({ link });
    expect(request).toHaveBeenLastCalledWith("/api/github/project-link?projectId=project-1");
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("keeps connected and disconnected project links isolated", async () => {
    await cacheEditorGitHubProjectLink(client, "alice", "project-1", link);
    await cacheEditorGitHubProjectLink(client, "alice", "project-2", null);
    expect(client.getQueryData(editorGitHubProjectLink("alice", "project-1").queryKey)).toEqual({ link });
    expect(client.getQueryData(editorGitHubProjectLink("alice", "project-2").queryKey)).toEqual({ link: null });
    expect(client.getQueryData(editorGitHubProjectLink("bob", "project-1").queryKey)).toBeUndefined();
  });

  it("does not let a pre-mutation read restore an old repository link", async () => {
    let finish!: (value: { link: GitHubProjectLink | null }) => void;
    request.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const options = editorGitHubProjectLink("alice", "project-1");
    const pending = client.fetchQuery(options).catch(() => null);
    await cacheEditorGitHubProjectLink(client, "alice", "project-1", null);
    finish({ link });
    await pending;
    expect(client.getQueryData(options.queryKey)).toEqual({ link: null });
  });
});

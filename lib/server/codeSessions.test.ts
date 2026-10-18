import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/requestSecurity", () => ({
  HttpError: class extends Error { constructor(public status: number, message: string) { super(message); } },
}));
import { runnerSessionRequest } from "@/lib/server/codeSessions";

const fetcher = vi.fn();
beforeEach(() => {
  vi.stubEnv("CODE_RUNNER_URL", "https://runner.example/api/v2/execute?legacy=1");
  vi.stubEnv("CODE_RUNNER_TOKEN", "server-secret");
  vi.stubGlobal("fetch", fetcher);
  fetcher.mockReset().mockResolvedValue(Response.json({ phase: "running", events: [], code: null }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("interactive runner proxy", () => {
  it("scopes session requests to the authenticated user and keeps capabilities out of URLs", async () => {
    await runnerSessionRequest("alice", { token: "signed-session", after: 2 });
    const [url, options] = fetcher.mock.calls[0];
    expect(url.toString()).toBe("https://runner.example/api/v2/session?after=2");
    expect(options.headers).toMatchObject({ Authorization: "Bearer server-secret", "x-scripticx-user": "alice", "x-scripticx-session": "signed-session" });
    expect(options.cache).toBe("no-store");
  });
  it("requires configured credentials before opening sessions", async () => {
    vi.stubEnv("CODE_RUNNER_TOKEN", "");
    await expect(runnerSessionRequest("alice", { body: { action: "start" } })).rejects.toMatchObject({ status: 503 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects insecure remote runner connections", async () => {
    vi.stubEnv("CODE_RUNNER_URL", "http://runner.example/api/v2");
    await expect(runnerSessionRequest("alice", { token: "session" })).rejects.toMatchObject({ status: 503 });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

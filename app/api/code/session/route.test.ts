import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ runner: vi.fn(), user: vi.fn(), rate: vi.fn() }));
vi.mock("@/lib/server/codeSessions", () => ({ runnerSessionRequest: mocks.runner }));
vi.mock("@/lib/server/requestSecurity", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/server/requestSecurity")>(),
  requireUser: mocks.user, enforceRateLimit: mocks.rate,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabaseServer", () => ({}));
import { POST } from "./route";

const request = (language = "cpp", mode = "run") => new Request("https://scripticx.test/api/code/session", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "start", mode, execution: { language, files: [{ name: "main.cpp", content: "int main() {}" }], stdin: "7\n", args: ["one"] } }),
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ user: { id: "alice" } });
  mocks.runner.mockResolvedValue({ token: "signed-session", expiresInMs: 300_000 });
});

describe("interactive execution route", () => {
  it("maps the editor's cpp language to c++ and preserves input, files, arguments and owner", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(mocks.runner).toHaveBeenCalledWith("alice", { body: {
      action: "start", mode: "run", execution: { language: "c++", files: [{ name: "main.cpp", content: "int main() {}" }], stdin: "7\n", args: ["one"] },
    }, token: undefined });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it.each(["run", "install"])("keeps Python %s sessions available", async mode => {
    expect((await POST(request("python", mode))).status).toBe(200);
    expect(mocks.runner.mock.calls[0][1].body.execution.language).toBe("python");
  });

  it.each([["cpp", "install"], ["javascript", "run"]])("rejects unsupported %s/%s sessions before forwarding", async (language, mode) => {
    expect((await POST(request(language, mode))).status).toBe(400);
    expect(mocks.runner).not.toHaveBeenCalled();
  });

  it("preserves project paths for fstream and rejects traversal before reaching the runner", async () => {
    const makeRequest = (name: string) => new Request("https://scripticx.test/api/code/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", mode: "run", execution: { language: "cpp", files: [{ name: "src/main.cpp", content: "int main() {}" }, { name, content: "42" }] } }),
    });
    expect((await POST(makeRequest("data/input.txt"))).status).toBe(200);
    expect(mocks.runner.mock.calls[0][1].body.execution.files[1]).toEqual({ name: "data/input.txt", content: "42" });
    mocks.runner.mockClear();
    expect((await POST(makeRequest("data/../../input.txt"))).status).toBe(400);
    expect(mocks.runner).not.toHaveBeenCalled();
  });
});

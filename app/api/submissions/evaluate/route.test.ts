import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProblemSubmissionLanguage } from "@/lib/problem-submission-language";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  from: vi.fn(), insert: vi.fn(), rpc: vi.fn(), auth: vi.fn(), rateLimit: vi.fn(),
  state: {
    allowedLanguages: null as ProblemSubmissionLanguage[] | null,
    reward: {} as Record<string, unknown>,
    rewardError: null as null | { message: string },
    tests: [] as { input: (number | string)[]; output: string }[],
  },
}));
vi.mock("@/lib/supabaseServer", () => ({
  createAdminSupabase: () => ({ from: mocks.from }),
  createAuthenticatedServerSupabase: () => ({ rpc: mocks.rpc }),
  createServerSupabase: vi.fn(),
}));
vi.mock("@/lib/server/requestSecurity", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/server/requestSecurity")>(),
  requireUser: mocks.auth, enforceRateLimit: mocks.rateLimit,
}));
import { POST } from "./route";
import { HttpError } from "@/lib/server/requestSecurity";

const request = (extra: Record<string, unknown> = {}) => new Request("http://localhost/api/submissions/evaluate", {
  method: "POST", headers: { Authorization: "Bearer fixture", "Content-Type": "application/json" },
  body: JSON.stringify({ problemId: "problem", code: "PRINT 1", ...extra }),
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "authenticated-user" }, accessToken: "fixture" });
  mocks.rateLimit.mockResolvedValue(undefined);
  mocks.insert.mockReturnValue({ select: () => ({ single: async () => ({ data: { id: "verified-submission" }, error: null }) }) });
  mocks.state.tests = [{ input: [], output: "1" }];
  mocks.state.allowedLanguages = null;
  mocks.from.mockImplementation(table => {
    if (table === "problems") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "problem", test_cases: mocks.state.tests, visibility: "public", publish_at: null, allowed_languages: mocks.state.allowedLanguages }, error: null }) }) }) };
    if (table === "submissions") return { insert: mocks.insert };
    throw new Error(`Unexpected standalone table operation: ${table}`);
  });
  mocks.state.rewardError = null;
  mocks.state.reward = { awarded: 137, base_points: 100, bonus_points: 37, bonus_awarded: true, daily_completed: true };
  mocks.rpc.mockImplementation(async (name) => name === "award_submission_reward" ? { data: mocks.state.reward, error: mocks.state.rewardError } : { data: [], error: null });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("verified submission reward API", () => {
  it("evaluates server-side and delegates completion and both rewards to one RPC", async () => {
    const response = await POST(request({ score: 1000, bonusPoints: 9999, userId: "someone-else" }));
    expect(response.status).toBe(200);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "authenticated-user", problem_id: "problem", language: "miniscript", score: 100, verified_at: expect.any(String), verification_source: "server-v1" }));
    expect(mocks.rpc).toHaveBeenCalledWith("award_submission_reward", { p_submission_id: "verified-submission" });
    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual(["problems", "submissions"]);
    expect(await response.json()).toMatchObject({ score: 100, bonusAwarded: true, bonusPoints: 37, dailyCompleted: true, reward: { awarded: 137 } });
  });
  it("returns only the configured daily bonus when the RPC reports an already solved problem", async () => {
    mocks.state.reward = { awarded: 37, base_points: 0, bonus_points: 37, bonus_awarded: true, daily_completed: true };
    expect(await (await POST(request())).json()).toMatchObject({ bonusAwarded: true, bonusPoints: 37, reward: { awarded: 37 } });
  });
  it("keeps the daily completed state on a repeat with no additional points", async () => {
    mocks.state.reward = { awarded: 0, base_points: 0, bonus_points: 0, bonus_awarded: false, daily_completed: true };
    expect(await (await POST(request())).json()).toMatchObject({ bonusAwarded: false, bonusPoints: 0, dailyCompleted: true });
  });
  it("does not trust the submitted score for a wrong answer", async () => {
    mocks.state.reward = { awarded: 0, bonus_points: 0, bonus_awarded: false, daily_completed: false };
    const response = await POST(request({ code: "PRINT 2", score: 100 }));
    expect(await response.json()).toMatchObject({ score: 0, bonusAwarded: false });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ score: 0 }));
  });
  it("returns a controlled error if the reward transaction fails", async () => {
    mocks.state.rewardError = { message: "transaction failed" };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await POST(request());
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Submission was evaluated but could not be rewarded" });
      expect(mocks.rpc).toHaveBeenCalledTimes(1);
    } finally { spy.mockRestore(); }
  });
  it("does not report success against an old reward-function response", async () => {
    mocks.state.reward = { awarded: 100 };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try { expect((await POST(request())).status).toBe(503); } finally { spy.mockRestore(); }
  });
  it("stops unauthenticated requests before saving a submission", async () => {
    mocks.auth.mockRejectedValueOnce(new HttpError(401, "Authentication required"));
    expect((await POST(request())).status).toBe(401);
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

describe("Python and C++ submissions", () => {
  const runner = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubEnv("CODE_RUNNER_URL", "https://runner.example/api/v2");
    vi.stubEnv("CODE_RUNNER_TOKEN", "fixture");
    vi.stubGlobal("fetch", runner);
    mocks.state.reward = { awarded: 0, bonus_points: 0, bonus_awarded: false };
    mocks.state.tests = [{ input: [3, "hello world"], output: "3" }, { input: [4], output: "4" }];
  });

  it("runs Python against separate inputs and only compares successful stdout", async () => {
    runner
      .mockResolvedValueOnce(Response.json({ run: { code: 0, stdout: "3\n", stderr: "a warning" } }))
      .mockResolvedValueOnce(Response.json({ run: { code: 1, stdout: "4\n", stderr: "Traceback" } }));
    const code = "print(input())";
    const response = await POST(request({ language: "python", code, score: 100 }));
    expect(await response.json()).toMatchObject({
      score: 50,
      results: [
        { passed: true, got: "3" },
        { passed: false, got: "4", failure: "runtimeError", diagnostics: "Traceback" },
      ],
    });
    expect(runner.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))).toEqual([
      expect.objectContaining({ language: "python", files: [{ name: "main.py", content: code }], stdin: "3\nhello world\n" }),
      expect.objectContaining({ language: "python", stdin: "4\n" }),
    ]);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ language: "python", score: 50 }));
  });

  it("saves successful C++ runs and uses the regular reward flow", async () => {
    runner
      .mockResolvedValueOnce(Response.json({ compile: { code: 0 }, run: { code: 0, stdout: "3" } }))
      .mockResolvedValueOnce(Response.json({ compile: { code: 0 }, run: { code: 0, stdout: "4" } }));
    const code = "int main() {}";
    const response = await POST(request({ language: "cpp", code }));
    expect(await response.json()).toMatchObject({ score: 100 });
    expect(JSON.parse(String(runner.mock.calls[0][1]?.body))).toMatchObject({
      language: "c++", files: [{ name: "main.cpp", content: code }],
    });
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ language: "cpp", score: 100 }));
    expect(mocks.rpc).toHaveBeenCalledWith("award_submission_reward", { p_submission_id: "verified-submission" });
  });

  it("stops after a compilation error without rerunning the compiler for every test", async () => {
    runner.mockResolvedValueOnce(Response.json({ compile: { code: 1, stderr: "expected ';'" }, run: { code: null } }));
    const response = await POST(request({ language: "cpp" }));
    expect(await response.json()).toMatchObject({
      score: 0, results: [{ failure: "compilationError", diagnostics: "expected ';'" }, { failure: "compilationError" }],
    });
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it("scores confirmed execution timeouts but does not save when the runner is unavailable", async () => {
    runner
      .mockResolvedValueOnce(Response.json({ error: "execution_timeout" }, { status: 504 }))
      .mockResolvedValueOnce(Response.json({ run: { code: 0, stdout: "4" } }));
    const timeout = await POST(request({ language: "python" }));
    expect(await timeout.json()).toMatchObject({ score: 50, results: [{ failure: "timeLimit" }, { passed: true }] });
    mocks.insert.mockClear();
    runner.mockResolvedValueOnce(Response.json({ error: "runtime_not_ready" }, { status: 503 }));
    expect((await POST(request({ language: "python" }))).status).toBe(502);
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("rejects languages outside the allowlist before evaluation", async () => {
    expect((await POST(request({ language: "constructor" }))).status).toBe(400);
    expect(runner).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("enforces the problem's language settings before running or saving a solution", async () => {
    mocks.state.allowedLanguages = ["python"];
    for (const submission of [request(), request({ language: "cpp" })]) {
      const response = await POST(submission);
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ code: "problem_language_not_allowed" });
    }
    expect(runner).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();

    runner.mockResolvedValueOnce(Response.json({ run: { code: 0, stdout: "1" } }));
    mocks.state.tests = [{ input: [], output: "1" }];
    expect((await POST(request({ language: "python", code: "print(1)" }))).status).toBe(200);
  });

  it("distinguishes a database write failure from a failed evaluation", async () => {
    mocks.state.tests = [{ input: [], output: "1" }];
    runner.mockResolvedValueOnce(Response.json({ run: { code: 0, stdout: "1" } }));
    mocks.insert.mockReturnValueOnce({
      select: () => ({ single: async () => ({ data: null, error: { code: "PGRST204" } }) }),
    });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await POST(request({ language: "python", code: "print(1)" }));
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ error: expect.stringContaining("evaluated") });
      expect(mocks.rpc).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });
});

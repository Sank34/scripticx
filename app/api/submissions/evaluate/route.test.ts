import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  from: vi.fn(), insert: vi.fn(), rpc: vi.fn(), auth: vi.fn(), rateLimit: vi.fn(),
  state: { reward: {} as Record<string, unknown>, rewardError: null as null | { message: string } },
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
  mocks.from.mockImplementation(table => {
    if (table === "problems") return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "problem", test_cases: [{ input: [], output: "1" }], visibility: "public", publish_at: null }, error: null }) }) }) };
    if (table === "submissions") return { insert: mocks.insert };
    throw new Error(`Unexpected standalone table operation: ${table}`);
  });
  mocks.state.rewardError = null;
  mocks.state.reward = { awarded: 137, base_points: 100, bonus_points: 37, bonus_awarded: true, daily_completed: true };
  mocks.rpc.mockImplementation(async (name) => name === "award_submission_reward" ? { data: mocks.state.reward, error: mocks.state.rewardError } : { data: [], error: null });
});

describe("verified submission reward API", () => {
  it("evaluates server-side and delegates completion and both rewards to one RPC", async () => {
    const response = await POST(request({ score: 1000, bonusPoints: 9999, userId: "someone-else" }));
    expect(response.status).toBe(200);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: "authenticated-user", problem_id: "problem", score: 100, verified_at: expect.any(String), verification_source: "server-v1" }));
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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("Supabase email worker client", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co/";
    process.env.MAIL_WORKER_SECRET = "worker-secret-that-is-longer-than-thirty-two-bytes";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("calls the no-JWT worker with the dedicated secret", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({ ok: true, mode: "health", provider: "resend", senderDomain: "scripticx.org", marketingEnabled: true })
    );
    vi.stubGlobal("fetch", fetchMock);
    const { getEmailWorkerHealth } = await import("./workerClient");

    await expect(getEmailWorkerHealth()).resolves.toMatchObject({ ok: true, mode: "health" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://project.supabase.co/functions/v1/email-worker");
    expect(init.headers).toMatchObject({
      "x-scripticx-worker-secret": process.env.MAIL_WORKER_SECRET,
    });
    expect(JSON.parse(String(init.body))).toEqual({ mode: "health" });
  });

  it("does not expose a worker request when the server secret is absent", async () => {
    vi.stubEnv("MAIL_WORKER_SECRET", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { getEmailWorkerHealth } = await import("./workerClient");

    await expect(getEmailWorkerHealth()).rejects.toMatchObject({
      status: 503,
      message: "Email worker is not configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps a rejected worker secret to a non-auth-leaking configuration error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 })));
    const { getEmailWorkerHealth } = await import("./workerClient");

    await expect(getEmailWorkerHealth()).rejects.toMatchObject({
      status: 503,
      message: "Email worker credentials are invalid",
    });
  });

  it("rejects a malformed successful worker response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ ok: true, mode: "queue" })));
    const { getEmailWorkerHealth } = await import("./workerClient");

    await expect(getEmailWorkerHealth()).rejects.toMatchObject({
      status: 502,
      message: "Email worker returned an invalid response",
    });
  });
});

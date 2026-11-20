import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_FETCH_TIMEOUT_MS,
  AUTH_SESSION_TIMEOUT_MS,
  resilientSupabaseFetch,
  supabaseAuthLock,
} from "@/lib/supabase-transport";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Supabase auth transport", () => {
  it("allows a slow auth response past the old four-second cutoff", async () => {
    vi.useFakeTimers();
    const fetch = vi.fn((_input, init: RequestInit) => new Promise<Response>((resolve, reject) => {
      const timer = setTimeout(() => resolve(Response.json({ ok: true })), 6_500);
      init.signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(init.signal?.reason);
      });
    }));
    vi.stubGlobal("fetch", fetch);
    const request = resilientSupabaseFetch("https://test.supabase.co/auth/v1/settings");
    await vi.advanceTimersByTimeAsync(6_500);
    expect((await request).ok).toBe(true);
    expect(fetch.mock.calls[0][1].signal?.aborted).toBe(false);
  });

  it("keeps the caller's cancellation and applies a finite auth timeout", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({}));
    vi.stubGlobal("fetch", fetch);
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const controller = new AbortController();
    await resilientSupabaseFetch(new Request("https://test.supabase.co/auth/v1/user", {
      signal: controller.signal,
    }));
    expect(timeout).toHaveBeenCalledWith(AUTH_FETCH_TIMEOUT_MS);
    controller.abort();
    expect(fetch.mock.calls[0][1].signal.aborted).toBe(true);
    timeout.mockRestore();
  });

  it("leaves database requests and their signals unchanged", async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json([]));
    vi.stubGlobal("fetch", fetch);
    const options = { method: "GET", signal: new AbortController().signal };
    await resilientSupabaseFetch("https://test.supabase.co/rest/v1/profiles", options);
    expect(fetch).toHaveBeenCalledWith("https://test.supabase.co/rest/v1/profiles", options);
  });
});

describe("Supabase auth locking", () => {
  it("keeps a running refresh exclusive after five seconds", async () => {
    vi.useFakeTimers();
    let finish!: () => void;
    const operation = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const request = vi.fn(async (_name, options, callback) => {
      options.signal?.addEventListener("abort", () => { throw new Error("Lock was interrupted"); });
      return callback({ name: "auth" });
    });
    vi.stubGlobal("navigator", { locks: { request } });
    const pending = supabaseAuthLock("auth", 5_000, operation);
    await vi.advanceTimersByTimeAsync(AUTH_SESSION_TIMEOUT_MS + 1);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][1]).not.toHaveProperty("steal");
    expect(request.mock.calls[0][1].signal.aborted).toBe(false);
    finish();
    await pending;
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("fails a queued request without breaking the lock held by another tab", async () => {
    vi.useFakeTimers();
    const operation = vi.fn();
    const request = vi.fn((_name, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(options.signal.reason));
    }));
    vi.stubGlobal("navigator", { locks: { request } });
    const outcome = supabaseAuthLock("auth", 5_000, operation).catch((error) => error);
    await vi.advanceTimersByTimeAsync(AUTH_SESSION_TIMEOUT_MS + 1);
    expect(await outcome).toMatchObject({ isAcquireTimeout: true });
    expect(request).toHaveBeenCalledTimes(1);
    expect(operation).not.toHaveBeenCalled();
  });

  it("keeps the nonblocking background-refresh contract", async () => {
    const request = vi.fn(async (_name, _options, callback) => callback(null));
    vi.stubGlobal("navigator", { locks: { request } });
    const operation = vi.fn();
    await expect(supabaseAuthLock("auth", 0, operation)).rejects.toMatchObject({ isAcquireTimeout: true });
    expect(request.mock.calls[0][1]).toEqual({ mode: "exclusive", ifAvailable: true });
    expect(operation).not.toHaveBeenCalled();
  });
});

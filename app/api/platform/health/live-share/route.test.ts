import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  channel: vi.fn(),
  on: vi.fn(),
  subscribe: vi.fn(),
  send: vi.fn(),
  disconnect: vi.fn(),
}));
vi.mock("@/lib/supabaseServer", () => ({ createServerSupabase: mocks.create }));

let broadcast: (message: { payload: { nonce: string } }) => void;
let subscription: (status: string) => void;
let GET: typeof import("./route").GET;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  vi.resetAllMocks();
  const channel = { on: mocks.on, subscribe: mocks.subscribe, send: mocks.send };
  mocks.channel.mockReturnValue(channel);
  mocks.on.mockImplementation((_type, _filter, callback) => { broadcast = callback; return channel; });
  mocks.subscribe.mockImplementation((callback) => { subscription = callback; return channel; });
  mocks.send.mockImplementation(async ({ payload }) => {
    broadcast({ payload });
    return "ok";
  });
  mocks.disconnect.mockResolvedValue("ok");
  mocks.create.mockReturnValue({ channel: mocks.channel, realtime: { disconnect: mocks.disconnect } });
  GET = (await import("./route")).GET;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Live Share monitoring", () => {
  it("requires an acknowledged broadcast received through a temporary channel", async () => {
    const pending = GET();
    expect(mocks.send).not.toHaveBeenCalled();
    subscription("SUBSCRIBED");
    const response = await pending;
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ service: "live-share", status: "operational" });
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(mocks.channel).toHaveBeenCalledWith(expect.stringMatching(/^health-live-share-/), {
      config: { broadcast: { self: true, ack: true } },
    });
    expect(mocks.disconnect).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("waits for delivery even when the server acknowledges the send", async () => {
    mocks.send.mockResolvedValue("ok");
    const pending = GET();
    subscription("SUBSCRIBED");
    await vi.advanceTimersByTimeAsync(10_001);
    const response = await pending;
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ status: "outage" });
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });

  it("ignores unrelated messages and rejects failed acknowledgements", async () => {
    mocks.send.mockImplementation(async () => {
      broadcast({ payload: { nonce: "unrelated" } });
      return "error";
    });
    const pending = GET();
    subscription("SUBSCRIBED");
    expect((await pending).status).toBe(503);
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });

  it.each(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"])("reports %s and releases the socket", async (status) => {
    const pending = GET();
    subscription(status);
    expect((await pending).status).toBe(503);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.disconnect).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("bounds a stalled subscription", async () => {
    const pending = GET();
    await vi.advanceTimersByTimeAsync(10_001);
    expect((await pending).status).toBe(503);
    expect(mocks.disconnect).toHaveBeenCalledOnce();
  });

  it("coalesces concurrent monitors and probes again after ten seconds", async () => {
    const requests = [GET(), GET()];
    subscription("SUBSCRIBED");
    expect((await Promise.all(requests)).map((response) => response.status)).toEqual([200, 200]);
    expect((await GET()).status).toBe(200);
    expect(mocks.channel).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10_001);
    const pending = GET();
    subscription("SUBSCRIBED");
    expect((await pending).status).toBe(200);
    expect(mocks.channel).toHaveBeenCalledTimes(2);
    expect(mocks.disconnect).toHaveBeenCalledTimes(2);
  });

  it("returns a controlled outage when the client cannot be configured", async () => {
    mocks.create.mockImplementation(() => { throw new Error("configuration secret"); });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await GET();
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain("configuration secret");
      expect(vi.getTimerCount()).toBe(0);
    } finally { log.mockRestore(); }
  });
});

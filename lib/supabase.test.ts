import { afterEach, describe, expect, it, vi } from "vitest";

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn(() => ({ auth: {} })) }));
vi.mock("@supabase/supabase-js", async (importOriginal) => ({
  ...await importOriginal<typeof import("@supabase/supabase-js")>(),
  createClient,
}));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  delete (globalThis as Record<string, unknown>).scripticxSupabaseClient;
  vi.resetModules();
  createClient.mockClear();
});

describe("browser Supabase client ownership", () => {
  it("reuses the browser auth client when development reloads its module", async () => {
    vi.stubGlobal("window", {});
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fixture");
    const first = (await import("@/lib/supabase")).supabase;
    vi.resetModules();
    const second = (await import("@/lib/supabase")).supabase;
    expect(first).toBe(second);
    expect(createClient).toHaveBeenCalledTimes(1);
  });
});

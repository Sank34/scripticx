import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookies, from, select, eq, maybeSingle } = vi.hoisted(() => ({
  cookies: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies }));
vi.mock("@/lib/supabaseServer", () => ({
  createServerSupabase: () => ({ from }),
}));

import { getRepositoryListMetadata, getRepositoryMetadata } from "./repository-metadata";

const params = Promise.resolve({ id: "repo-id" });

beforeEach(() => {
  vi.clearAllMocks();
  cookies.mockResolvedValue({ get: () => ({ value: "ro-RO" }) });
  from.mockReturnValue({ select });
  select.mockReturnValue({ eq });
  eq.mockReturnValue({ eq, maybeSingle });
});

describe("repository metadata", () => {
  it("localizes the account list and keeps it out of search indexes", async () => {
    const metadata = await getRepositoryListMetadata();
    expect(metadata).toMatchObject({
      title: "Repozitorii",
      openGraph: { locale: "ro_RO" },
      robots: { index: false },
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("uses public repository details and the repository canonical URL", async () => {
    maybeSingle.mockResolvedValue({ data: { title: "Calculator", description: "Un exemplu de program." } });
    const metadata = await getRepositoryMetadata({ params });
    expect(metadata).toMatchObject({
      title: "Calculator",
      description: "Un exemplu de program.",
      openGraph: { locale: "ro_RO" },
      robots: { index: true },
    });
    expect(metadata.alternates?.canonical).toMatch(/\/repos\/repo-id$/);
    expect(eq).toHaveBeenCalledWith("is_public", true);
  });

  it("uses generic metadata when the repository is private or missing", async () => {
    cookies.mockResolvedValueOnce({ get: () => undefined });
    maybeSingle.mockResolvedValue({ data: null });
    expect(await getRepositoryMetadata({ params })).toMatchObject({
      title: "Repository",
      openGraph: { locale: "en_US" },
      robots: { index: false },
    });
  });
});

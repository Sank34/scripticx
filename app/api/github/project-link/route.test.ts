import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/server/githubApp", () => ({
  getProjectLink: vi.fn(), publicProjectLink: vi.fn(value => value), requireOwnedProject: vi.fn(),
  getBranchHead: vi.fn(), githubFetch: vi.fn(), requireInstallationForUser: vi.fn(),
}));
vi.mock("@/lib/server/requestSecurity", () => ({
  requireUser: vi.fn(),
  HttpError: class extends Error { constructor(public status: number, message: string) { super(message); } },
  jsonObject: vi.fn(), readJsonBody: vi.fn(), stringField: vi.fn(),
}));
vi.mock("@/lib/supabaseServer", () => ({ createAdminSupabase: vi.fn() }));
vi.mock("@/lib/server/githubRoute", () => ({
  githubRouteError: (error: { status?: number; message: string }) => Response.json({ error: error.message }, { status: error.status ?? 500 }),
}));

import { GET } from "./route";
import { getProjectLink, requireOwnedProject } from "@/lib/server/githubApp";
import { HttpError, requireUser } from "@/lib/server/requestSecurity";

const request = (query = "?projectId=project-1") => new Request(`https://scripticx.test/api/github/project-link${query}`);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireUser).mockResolvedValue({ user: { id: "alice" } } as Awaited<ReturnType<typeof requireUser>>);
  vi.mocked(requireOwnedProject).mockResolvedValue({} as Awaited<ReturnType<typeof requireOwnedProject>>);
  vi.mocked(getProjectLink).mockResolvedValue(null);
});

describe("saved project GitHub connection", () => {
  it("requires authentication", async () => {
    vi.mocked(requireUser).mockRejectedValueOnce(new HttpError(401, "Unauthorized"));
    expect((await GET(request())).status).toBe(401);
    expect(getProjectLink).not.toHaveBeenCalled();
  });

  it("requires the owner before reading a project's connection", async () => {
    vi.mocked(requireOwnedProject).mockRejectedValueOnce(new HttpError(403, "Forbidden"));
    expect((await GET(request())).status).toBe(403);
    expect(requireOwnedProject).toHaveBeenCalledWith("alice", "project-1");
    expect(getProjectLink).not.toHaveBeenCalled();
  });

  it("distinguishes a saved project without a repository from a loading error", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ link: null });
    expect(getProjectLink).toHaveBeenCalledWith("alice", "project-1");
  });

  it("rejects a missing project ID", async () => {
    expect((await GET(request(""))).status).toBe(400);
    expect(getProjectLink).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ create: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), single: vi.fn() }));
vi.mock("@/lib/supabaseServer", () => ({ createServerSupabase: mocks.create }));
import { getStudyGroupMetadata } from "./groupMetadata";

const group = { id: "group-id", name: "Algorithms Club", slug: "algorithms", description: "Programming together", visibility: "public", banner_url: null };
const channel = { id: "00000000-0000-4000-8000-000000000001", name: "general" };
beforeEach(() => {
  vi.resetAllMocks();
  const chain = { select: mocks.select, eq: mocks.eq, maybeSingle: mocks.single };
  mocks.select.mockReturnValue(chain); mocks.eq.mockReturnValue(chain);
  mocks.from.mockReturnValue(chain);
  mocks.create.mockReturnValue({ from: mocks.from });
});

describe("public group metadata lookup", () => {
  it("uses the anonymous client, explicitly filters public groups and scopes channels to their group", async () => {
    mocks.single.mockResolvedValueOnce({ data: group, error: null }).mockResolvedValueOnce({ data: channel, error: null });
    expect(await getStudyGroupMetadata("algorithms", channel.id)).toMatchObject({ title: "#general · Algorithms Club" });
    expect(mocks.create).toHaveBeenCalledWith({ fetchTimeoutMs: 3000 });
    expect(mocks.eq.mock.calls).toEqual([["slug", "algorithms"], ["visibility", "public"], ["group_id", "group-id"], ["id", channel.id]]);
    expect(mocks.from.mock.calls.flat()).toEqual(["study_groups", "study_group_channels"]);
    expect(mocks.select.mock.calls.flat().join(" ")).not.toMatch(/messages|members|\*/);
  });
  it.each([null, { ...group, visibility: "private" }])("does not query channels for an unavailable or private group", async (data) => {
    mocks.single.mockResolvedValue({ data, error: null });
    expect(await getStudyGroupMetadata("algorithms", channel.id)).toMatchObject({ title: "Study Group", robots: { index: false } });
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it("falls back to group metadata when a channel is hidden, missing, or belongs elsewhere", async () => {
    mocks.single.mockResolvedValueOnce({ data: group, error: null }).mockResolvedValueOnce({ data: null, error: null });
    expect(await getStudyGroupMetadata("algorithms", channel.id)).toMatchObject({ title: "Algorithms Club — Study Group" });
  });
  it("ignores malformed channel IDs", async () => {
    mocks.single.mockResolvedValue({ data: group, error: null });
    expect(await getStudyGroupMetadata("algorithms", "../channel")).toMatchObject({ title: "Algorithms Club — Study Group" });
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it("keeps metadata generic during a database outage", async () => {
    mocks.single.mockRejectedValue(new Error("Database unavailable"));
    expect(await getStudyGroupMetadata("algorithms")).toMatchObject({ title: "Study Group", robots: { index: false } });
  });
});

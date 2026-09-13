import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  normalizeCampaignUserIdentifiers,
  resolveCampaignAudience,
} from "@/lib/mail/adminAudience";

function adminWithProfiles(profiles: Array<{ id: string; username: string }>) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        in: vi.fn((_column: string, usernames: string[]) => ({
          returns: vi.fn(async () => ({
            data: profiles.filter((profile) => usernames.includes(profile.username)),
            error: null,
          })),
        })),
      })),
    })),
  } as never;
}

describe("admin campaign audience", () => {
  it("normalizes usernames, @mentions and duplicates", () => {
    expect(normalizeCampaignUserIdentifiers([" Sanke ", "@Teacher", "sanke"])).toEqual([
      "sanke",
      "teacher",
    ]);
  });

  it("resolves usernames while preserving canonical UUIDs", async () => {
    const directId = "550e8400-e29b-41d4-a716-446655440000";
    const sankeId = "3d594650-3436-4f92-b8a9-2b8ea820dd31";
    const audience = await resolveCampaignAudience(
      adminWithProfiles([{ id: sankeId, username: "sanke" }]),
      { type: "users", userIds: ["@Sanke", directId] }
    );

    expect(audience).toEqual({
      type: "users",
      userIds: [directId, sankeId],
      identifiers: ["sanke", directId],
    });
  });

  it("reports usernames that do not exist", async () => {
    await expect(
      resolveCampaignAudience(adminWithProfiles([]), {
        type: "users",
        userIds: ["missing-user"],
      })
    ).rejects.toThrow("User not found: @missing-user");
  });
});

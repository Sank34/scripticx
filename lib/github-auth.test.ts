import { describe, expect, it } from "vitest";

import {
  GITHUB_AUTH_SCOPES,
  getGitHubIdentitySummary,
} from "@/lib/github-auth";

describe("GitHub auth helpers", () => {
  it("requests identity-only scopes during authentication", () => {
    expect(GITHUB_AUTH_SCOPES).toBe("read:user user:email");
    expect(GITHUB_AUTH_SCOPES).not.toContain("repo");
  });

  it("extracts the linked GitHub identity without using another provider", () => {
    const summary = getGitHubIdentitySummary({
      identities: [
        {
          id: "google-id",
          user_id: "user-id",
          identity_data: { user_name: "google-user" },
          identity_id: "google-id",
          provider: "google",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          last_sign_in_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "github-id",
          user_id: "user-id",
          identity_data: {
            user_name: "scripticx-dev",
            avatar_url: "https://avatars.githubusercontent.com/u/1",
          },
          identity_id: "github-id",
          provider: "github",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          last_sign_in_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      user_metadata: {},
    });

    expect(summary).toEqual({
      username: "scripticx-dev",
      avatarUrl: "https://avatars.githubusercontent.com/u/1",
    });
  });

  it("returns null when GitHub is not linked", () => {
    expect(
      getGitHubIdentitySummary({ identities: [], user_metadata: {} })
    ).toBeNull();
  });
});

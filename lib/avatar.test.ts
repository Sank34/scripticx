import { describe, expect, it } from "vitest";

import { DEFAULT_AVATAR_URL, resolveAvatarUrl } from "@/lib/avatar";

describe("resolveAvatarUrl", () => {
  it("keeps a stored picture", () => {
    const stored = "https://cdn.example.com/avatars/user/photo.png";

    expect(resolveAvatarUrl(stored)).toBe(stored);
  });

  it("falls back to the default when the account has no picture", () => {
    expect(resolveAvatarUrl(null)).toBe(DEFAULT_AVATAR_URL);
    expect(resolveAvatarUrl(undefined)).toBe(DEFAULT_AVATAR_URL);
  });

  it.each(["", "   ", "null", "NULL", "undefined"])(
    "treats %o as no picture",
    (value) => {
      expect(resolveAvatarUrl(value)).toBe(DEFAULT_AVATAR_URL);
    }
  );

  it("trims a stored picture", () => {
    expect(resolveAvatarUrl("  https://cdn.example.com/a.png  ")).toBe(
      "https://cdn.example.com/a.png"
    );
  });

  it("points at a file that ships with the app", () => {
    expect(DEFAULT_AVATAR_URL).toBe("/avatars/default-pfp.svg");
  });
});

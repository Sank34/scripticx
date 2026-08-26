import { describe, expect, it } from "vitest";

import {
  DEFAULT_PUBLIC_PROFILE_VISIBILITY,
  normalizePublicProfileVisibility,
} from "./profile-visibility";

describe("normalizePublicProfileVisibility", () => {
  it("keeps every widget visible for existing profiles", () => {
    expect(normalizePublicProfileVisibility(null)).toEqual(
      DEFAULT_PUBLIC_PROFILE_VISIBILITY
    );
  });

  it("only hides widgets explicitly disabled by the user", () => {
    expect(
      normalizePublicProfileVisibility({ points: false, posts: false })
    ).toMatchObject({
      points: false,
      posts: false,
      activity: true,
      stats: true,
    });
  });

  it("ignores invalid and unknown preference values", () => {
    expect(
      normalizePublicProfileVisibility({
        activity: "false",
        unknownWidget: false,
      })
    ).toEqual(DEFAULT_PUBLIC_PROFILE_VISIBILITY);
  });
});

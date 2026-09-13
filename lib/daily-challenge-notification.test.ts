import { describe, expect, it } from "vitest";

import {
  getDailyChallengeNotificationContent,
  getDailyChallengeProblemTitle,
} from "./daily-challenge-notification";

describe("daily challenge notification content", () => {
  it("uses the localized problem title in the notification body", () => {
    expect(
      getDailyChallengeNotificationContent(
        { en: "Sum of digits", ro: "Suma cifrelor" },
        "ro"
      )
    ).toMatchObject({
      body: "Rezolvă: Suma cifrelor",
      problemTitle: "Suma cifrelor",
    });
  });

  it("can relocalize a saved notification from its metadata", () => {
    const metadata = {
      problemTitleI18n: { en: "Sum of digits", ro: "Suma cifrelor" },
    };

    expect(
      getDailyChallengeProblemTitle({
        body: "Solve: Sum of digits",
        locale: "ro",
        metadata,
      })
    ).toBe("Suma cifrelor");
  });

  it("does not mistake the old generic copy for a problem title", () => {
    expect(
      getDailyChallengeProblemTitle({
        body: "Solve today's coding challenge.",
        locale: "en",
      })
    ).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import {
  formatBirthDateForStorage,
  getRegistrationBirthDate,
  isAllowedBirthDate,
  parseStoredBirthDate,
} from "@/lib/birthday";

describe("birthday date helpers", () => {
  it("round-trips a local calendar date without a timezone shift", () => {
    const birthday = new Date(2012, 1, 29);

    expect(formatBirthDateForStorage(birthday)).toBe("2012-02-29");
    expect(parseStoredBirthDate("2012-02-29")?.getDate()).toBe(29);
  });

  it("rejects impossible, future, and out-of-range dates", () => {
    const today = new Date(2026, 8, 2);

    expect(isAllowedBirthDate("2012-02-30", today)).toBe(false);
    expect(isAllowedBirthDate("2026-09-03", today)).toBe(false);
    expect(isAllowedBirthDate("1899-12-31", today)).toBe(false);
    expect(isAllowedBirthDate("2012-02-29", today)).toBe(true);
  });

  it("only accepts a valid registration metadata value", () => {
    expect(
      getRegistrationBirthDate({
        scripticx_registration_birth_date: "2014-04-08",
      })
    ).toBe("2014-04-08");
    expect(
      getRegistrationBirthDate({
        scripticx_registration_birth_date: "not-a-date",
      })
    ).toBeNull();
  });
});

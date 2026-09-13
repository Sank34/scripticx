import { expect, it } from "vitest";
import { updatePublicationDate } from "./update-publication";

it("publishes on the Bucharest calendar day, including before UTC midnight", () => {
  expect(updatePublicationDate(new Date("2026-09-12T20:59:59Z"))).toBe("2026-09-12");
  expect(updatePublicationDate(new Date("2026-09-12T21:00:00Z"))).toBe("2026-09-13");
  expect(updatePublicationDate(new Date("2026-01-12T21:59:59Z"))).toBe("2026-01-12");
  expect(updatePublicationDate(new Date("2026-01-12T22:00:00Z"))).toBe("2026-01-13");
});

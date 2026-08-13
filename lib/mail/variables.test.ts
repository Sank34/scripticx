import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  assertSupportedMailVariables,
  interpolateMailVariables,
  unknownMailVariables,
} from "@/lib/mail/variables";

const variables = {
  first_name: "Ana",
  username: "ana_code",
  email: "ana@example.com",
  action_url: "https://platform.scripticx.org/dashboard",
  unsubscribe_url: "https://platform.scripticx.org/unsubscribe",
};

describe("mail variables", () => {
  it("interpolates only the documented recipient variables", () => {
    expect(
      interpolateMailVariables(
        "Salut, {{ first_name }} (@{{username}}) — {{email}}",
        variables
      )
    ).toBe("Salut, Ana (@ana_code) — ana@example.com");
  });

  it("detects and rejects unknown placeholders", () => {
    expect(unknownMailVariables("{{first_name}} {{password}} {{unknown_value}}")).toEqual([
      "password",
      "unknown_value",
    ]);
    expect(() => assertSupportedMailVariables("Hello {{password}}")).toThrow(
      "Unsupported email variables: password"
    );
  });
});


import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  campaignAudience,
  safeActionUrl,
  senderLocalPart,
} from "@/lib/mail/validation";

describe("mail validation", () => {
  it("locks sender addresses to a safe local part", () => {
    expect(senderLocalPart("Newsletter.Team")).toBe("newsletter.team");
    expect(() => senderLocalPart("hello@evil.example")).toThrow();
    expect(() => senderLocalPart("hello\nBcc:x@example.com")).toThrow();
  });

  it("allows HTTPS and internal paths but rejects ambiguous URLs", () => {
    expect(safeActionUrl("/dashboard")).toBe("/dashboard");
    expect(safeActionUrl("https://docs.scripticx.org/guide")).toBe(
      "https://docs.scripticx.org/guide"
    );
    expect(() => safeActionUrl("//evil.example/path")).toThrow();
    expect(() => safeActionUrl("www.example.com/path")).toThrow();
    expect(() => safeActionUrl("javascript:alert(1)")).toThrow();
  });

  it("uses canonical marketing segments", () => {
    expect(campaignAudience({ type: "segment", segment: "teachers" })).toEqual({
      type: "segment",
      segment: "teachers",
    });
    expect(() => campaignAudience({ type: "segment", segment: "user" })).toThrow();
  });

  it("keeps the administrator-facing identifiers for specific users", () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    expect(campaignAudience({
      type: "users",
      userIds: [userId],
      identifiers: ["sanke"],
    })).toEqual({
      type: "users",
      userIds: [userId],
      identifiers: ["sanke"],
    });
  });
});

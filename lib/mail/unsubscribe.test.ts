import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/lib/mail/unsubscribe";

const originalSecret = process.env.MAIL_UNSUBSCRIBE_SECRET;

describe("unsubscribe tokens", () => {
  beforeEach(() => {
    process.env.MAIL_UNSUBSCRIBE_SECRET = "test-only-secret-that-is-longer-than-thirty-two-bytes";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.MAIL_UNSUBSCRIBE_SECRET;
    else process.env.MAIL_UNSUBSCRIBE_SECRET = originalSecret;
  });

  it("verifies a signed, versioned marketing token", () => {
    const token = createUnsubscribeToken(
      "d9428888-122b-4c88-a6f9-3fcd4f93f160",
      "newsletter",
      Math.floor(Date.now() / 1000) + 600
    );
    expect(verifyUnsubscribeToken(token)).toMatchObject({
      userId: "d9428888-122b-4c88-a6f9-3fcd4f93f160",
      category: "newsletter",
    });
    expect(verifyUnsubscribeToken(`${token}tampered`)).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = createUnsubscribeToken(
      "d9428888-122b-4c88-a6f9-3fcd4f93f160",
      "newsletter",
      Math.floor(Date.now() / 1000) - 1
    );
    expect(verifyUnsubscribeToken(token)).toBeNull();
  });
});


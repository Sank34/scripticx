import { describe, expect, it } from "vitest";

import {
  signPlatformAccessToken,
  verifyPlatformAccessToken,
} from "@/lib/platformAccessToken";

describe("platform access token", () => {
  const secret = "test-secret-that-is-long-enough-for-hmac";

  it("round-trips a valid admin payload", async () => {
    const payload = {
      exp: Math.floor(Date.now() / 1000) + 60,
      role: "admin",
      userId: "user-1",
    };
    const token = await signPlatformAccessToken(payload, secret);
    await expect(verifyPlatformAccessToken(token, secret)).resolves.toEqual(payload);
  });

  it("rejects tampered and expired tokens", async () => {
    const expired = await signPlatformAccessToken(
      {
        exp: Math.floor(Date.now() / 1000) - 1,
        role: "admin",
        userId: "user-1",
      },
      secret
    );
    await expect(verifyPlatformAccessToken(expired, secret)).resolves.toBeNull();

    const valid = await signPlatformAccessToken(
      {
        exp: Math.floor(Date.now() / 1000) + 60,
        role: "admin",
        userId: "user-1",
      },
      secret
    );
    await expect(
      verifyPlatformAccessToken(`${valid.slice(0, -1)}x`, secret)
    ).resolves.toBeNull();
  });
});

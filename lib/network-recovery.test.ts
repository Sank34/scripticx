import { describe, expect, it } from "vitest";

import {
  NETWORK_RETRY_DELAYS_MS,
  getNetworkRetryDelay,
} from "@/lib/network-recovery";

describe("getNetworkRetryDelay", () => {
  it("uses a progressively slower recovery schedule", () => {
    expect([0, 1, 2, 3, 4, 5].map(getNetworkRetryDelay)).toEqual([
      5_000,
      15_000,
      30_000,
      60_000,
      120_000,
      300_000,
    ]);
  });

  it("keeps retrying at the maximum interval", () => {
    expect(getNetworkRetryDelay(20)).toBe(
      NETWORK_RETRY_DELAYS_MS[NETWORK_RETRY_DELAYS_MS.length - 1]
    );
  });

  it("normalizes invalid attempts", () => {
    expect(getNetworkRetryDelay(-2)).toBe(5_000);
    expect(getNetworkRetryDelay(Number.NaN)).toBe(5_000);
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createPinnedLookup,
  isPublicIpAddress,
  MAX_EXTERNAL_IMAGE_BYTES,
} from "@/lib/server/externalImage";

describe("external image network protection", () => {
  it("allows public addresses", () => {
    expect(isPublicIpAddress("8.8.8.8")).toBe(true);
    expect(isPublicIpAddress("2606:4700:4700::1111")).toBe(true);
    expect(isPublicIpAddress("::ffff:8.8.8.8")).toBe(true);
  });

  it("blocks private, local, documentation and transition addresses", () => {
    for (const address of [
      "0.0.0.0",
      "10.0.0.1",
      "127.0.0.1",
      "169.254.169.254",
      "172.20.0.1",
      "192.168.1.1",
      "192.0.2.10",
      "198.51.100.10",
      "203.0.113.10",
      "::1",
      "fc00::1",
      "fe80::1",
      "2001:db8::1",
      "2001::1",
      "2001:2::1",
      "2001:20::1",
      "2002::1",
      "::ffff:127.0.0.1",
    ]) {
      expect(isPublicIpAddress(address), address).toBe(false);
    }
  });

  it("stays below the buffered serverless response limit", () => {
    expect(MAX_EXTERNAL_IMAGE_BYTES).toBeLessThanOrEqual(4 * 1024 * 1024);
  });

  it("returns the callback shape requested by modern Node lookup callers", async () => {
    const pinnedLookup = createPinnedLookup("8.8.8.8", 4);

    const allAddresses = await new Promise<unknown>((resolve, reject) => {
      pinnedLookup("example.com", { all: true }, (error, addresses) => {
        if (error) reject(error);
        else resolve(addresses);
      });
    });
    expect(allAddresses).toEqual([{ address: "8.8.8.8", family: 4 }]);

    const singleAddress = await new Promise<{ address: unknown; family?: number }>(
      (resolve, reject) => {
        pinnedLookup("example.com", { all: false }, (error, address, family) => {
          if (error) reject(error);
          else resolve({ address, family });
        });
      }
    );
    expect(singleAddress).toEqual({ address: "8.8.8.8", family: 4 });
  });
});

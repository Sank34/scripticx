import { describe, expect, it } from "vitest";

import {
  DEFAULT_BADGES,
  SHOP_CATALOG,
  hasLeafCanopyBackground,
  resolveEquippedReward,
  rewardProductToSnapshot,
} from "@/lib/rewards";

describe("reward catalog", () => {
  it("uses unique product ids and positive prices", () => {
    const ids = SHOP_CATALOG.map((product) => product.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(SHOP_CATALOG.every((product) => product.price > 0)).toBe(true);
  });

  it("provides both supported languages for every product", () => {
    for (const product of SHOP_CATALOG) {
      expect(product.name.en.trim()).not.toBe("");
      expect(product.name.ro.trim()).not.toBe("");
      expect(product.description.en.trim()).not.toBe("");
      expect(product.description.ro.trim()).not.toBe("");
    }
  });

  it("keeps profile backgrounds separate from user-uploaded banners", () => {
    const background = SHOP_CATALOG.find(
      (product) => product.id === "leaf-canopy-background"
    );

    expect(background?.category).toBe("profile-background");
    expect(
      SHOP_CATALOG.some((product) => String(product.category) === "profile-banner")
    ).toBe(false);
  });

  it("recognizes both the new background and the legacy equipped reward", () => {
    expect(
      hasLeafCanopyBackground({
        "profile-background": "leaf-canopy-background",
      })
    ).toBe(true);
    expect(
      hasLeafCanopyBackground({
        "profile-banner": "aurora-profile",
      })
    ).toBe(true);
  });

  it("keeps custom asset settings in equipped snapshots", () => {
    const snapshot = rewardProductToSnapshot({
      id: "custom-stars",
      category: "avatar-decoration",
      name: { en: "Stars", ro: "Stele" },
      description: { en: "", ro: "" },
      price: 250,
      rarity: "common",
      visual: "custom-overlay",
      assetUrl: "https://assets.example/stars.svg",
      styleConfig: { assetScale: 150, assetOffsetY: -8 },
    });

    expect(resolveEquippedReward(snapshot)).toEqual(snapshot);
    expect(snapshot.assetUrl).toContain("stars.svg");
    expect(snapshot.styleConfig?.assetScale).toBe(150);
  });
});

describe("badge prototypes", () => {
  it("uses unique ids and automation keys", () => {
    const ids = DEFAULT_BADGES.map((badge) => badge.id);
    const keys = DEFAULT_BADGES.map((badge) => badge.key);

    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("contains definitions for the automatic achievement rules", () => {
    const keys = new Set(DEFAULT_BADGES.map((badge) => badge.key));

    for (const key of ["first_solve", "five_solves", "ten_solves", "perfect"]) {
      expect(keys.has(key)).toBe(true);
    }
  });
});

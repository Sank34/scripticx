import { describe, expect, it } from "vitest";

import {
  getInlineStickerToken,
  isStickerOnlyMessage,
  tokenizeGroupMessage,
} from "@/lib/group-messages";

describe("tokenizeGroupMessage", () => {
  it("keeps plain text in one piece", () => {
    expect(tokenizeGroupMessage("hai la lectie")).toEqual([
      { type: "text", value: "hai la lectie" },
    ]);
  });

  it("splits mentions out of the surrounding text", () => {
    expect(tokenizeGroupMessage("salut @andrei si @maia!")).toEqual([
      { type: "text", value: "salut " },
      { type: "mention", username: "andrei", value: "@andrei" },
      { type: "text", value: " si " },
      { type: "mention", username: "maia", value: "@maia" },
      { type: "text", value: "!" },
    ]);
  });

  it("does not turn email addresses into mentions", () => {
    expect(tokenizeGroupMessage("scrie la hello@example.com")).toEqual([
      { type: "text", value: "scrie la hello@example.com" },
    ]);
  });

  it("recognizes live room links in both shapes", () => {
    expect(
      tokenizeGroupMessage("/live/abc123 si /editor/live/abc123")
    ).toEqual([
      { type: "live-room", roomId: "abc123", value: "/live/abc123" },
      { type: "text", value: " si " },
      {
        type: "live-room",
        roomId: "abc123",
        value: "/editor/live/abc123",
      },
    ]);
  });

  it("recognizes inline stickers", () => {
    const token = getInlineStickerToken({ id: "a1b2c3" });

    expect(tokenizeGroupMessage(`bravo ${token}`)).toEqual([
      { type: "text", value: "bravo " },
      { type: "sticker", token: ":sticker-a1b2c3:", value: ":sticker-a1b2c3:" },
    ]);
  });
});

describe("isStickerOnlyMessage", () => {
  it("recognizes a message that carries nothing but one sticker", () => {
    expect(isStickerOnlyMessage(":sticker-a1b2c3:")).toBe(true);
    expect(isStickerOnlyMessage("  :sticker-a1b2c3:  ")).toBe(true);
  });

  it("keeps a bubble for a sticker sent next to text or another sticker", () => {
    expect(isStickerOnlyMessage("bravo :sticker-a1b2c3:")).toBe(false);
    expect(
      isStickerOnlyMessage(":sticker-a1b2c3: :sticker-d4e5f6:")
    ).toBe(false);
    expect(isStickerOnlyMessage("")).toBe(false);
  });
});

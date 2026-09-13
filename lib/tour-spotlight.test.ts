import { describe, expect, it } from "vitest";
import { clipTourSpotlight } from "./tour-spotlight";

describe("tour spotlight clipping", () => {
  const visible = { left: 280, top: 72, right: 1272, bottom: 712 };

  it("keeps a long shop or docs page inside its visible scroll container", () => {
    expect(clipTourSpotlight({ left: 290, top: -800, right: 1290, bottom: 3000 }, visible))
      .toEqual({ left: 282, top: 72, width: 990, height: 640 });
  });

  it("preserves padding around a small target", () => {
    expect(clipTourSpotlight({ left: 320, top: 120, right: 420, bottom: 160 }, visible))
      .toEqual({ left: 312, top: 112, width: 116, height: 56 });
  });

  it("does not draw a spotlight for a completely clipped target", () => {
    expect(clipTourSpotlight({ left: 320, top: 900, right: 420, bottom: 950 }, visible)).toBeNull();
  });
});

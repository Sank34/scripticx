import { describe, expect, it } from "vitest";

import {
  parseWorkspaceImageId,
  WorkspaceAssetError,
  workspaceImageUrl,
} from "@/lib/workspace-assets";

describe("workspace image urls", () => {
  it("round-trips opaque image ids", () => {
    const id = "15ca0eef-274c-47ad-b450-07acd964b881";
    expect(parseWorkspaceImageId(workspaceImageUrl(id))).toBe(id);
  });

  it("does not treat regular or malformed urls as local images", () => {
    expect(parseWorkspaceImageId("https://example.com/photo.png")).toBeNull();
    expect(parseWorkspaceImageId("workspace-image://../../secret")).toBeNull();
    expect(parseWorkspaceImageId("workspace-image://short")).toBeNull();
  });

  it("rejects invalid generated ids", () => {
    expect(() => workspaceImageUrl("../asset")).toThrow(WorkspaceAssetError);
  });
});

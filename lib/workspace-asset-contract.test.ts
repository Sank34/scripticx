import { describe, expect, it } from "vitest";

import {
  isWorkspaceImageId,
  isWorkspaceImageMimeType,
  workspaceImageObjectPath,
} from "@/lib/workspace-asset-contract";

describe("workspace image contract", () => {
  it("accepts only private image asset identifiers", () => {
    expect(isWorkspaceImageId("89b1d674-7d2e-4670-99ad-5c60480c4d04")).toBe(true);
    expect(isWorkspaceImageId("../../another-user/file")).toBe(false);
    expect(isWorkspaceImageId("short")).toBe(false);
  });

  it("keeps cloud objects inside the authenticated user prefix", () => {
    expect(workspaceImageObjectPath("user-123", "asset_12345678")).toBe(
      "user-123/asset_12345678"
    );
    expect(() => workspaceImageObjectPath("user-123", "../asset")).toThrow();
  });

  it("accepts only the image formats supported by the editor", () => {
    expect(isWorkspaceImageMimeType("image/png")).toBe(true);
    expect(isWorkspaceImageMimeType("image/svg+xml")).toBe(false);
    expect(isWorkspaceImageMimeType("text/html")).toBe(false);
  });
});

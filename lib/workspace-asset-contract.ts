export const WORKSPACE_IMAGE_BUCKET = "workspace-note-images";
export const WORKSPACE_IMAGE_SCHEME = "workspace-image://";
export const MAX_WORKSPACE_IMAGE_BYTES = 8 * 1024 * 1024;

export const WORKSPACE_IMAGE_MIME_TYPES = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const WORKSPACE_IMAGE_ID_PATTERN = /^[a-zA-Z0-9_-]{8,128}$/;

export type WorkspaceImageMimeType = (typeof WORKSPACE_IMAGE_MIME_TYPES)[number];

export function isWorkspaceImageId(value: string) {
  return WORKSPACE_IMAGE_ID_PATTERN.test(value);
}

export function isWorkspaceImageMimeType(
  value: unknown
): value is WorkspaceImageMimeType {
  return (
    typeof value === "string" &&
    WORKSPACE_IMAGE_MIME_TYPES.includes(value as WorkspaceImageMimeType)
  );
}

export function workspaceImageObjectPath(userId: string, assetId: string) {
  if (!userId || !isWorkspaceImageId(assetId)) {
    throw new Error("Invalid workspace image path.");
  }
  return `${userId}/${assetId}`;
}

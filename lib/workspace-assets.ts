import {
  isWorkspaceImageId,
  isWorkspaceImageMimeType,
  MAX_WORKSPACE_IMAGE_BYTES,
  WORKSPACE_IMAGE_BUCKET,
  WORKSPACE_IMAGE_MIME_TYPES,
  WORKSPACE_IMAGE_SCHEME,
} from "@/lib/workspace-asset-contract";

export { MAX_WORKSPACE_IMAGE_BYTES, WORKSPACE_IMAGE_SCHEME };

const DATABASE_NAME = "scripticx-workspace-assets";
const DATABASE_VERSION = 1;
const IMAGE_STORE = "images";
const CLOUD_ASSET_STATE_PREFIX = "scripticx:workspace-images:cloud:v1";

const allowedImageTypes = new Set<string>(WORKSPACE_IMAGE_MIME_TYPES);

async function workspaceSupabase() {
  const { supabase } = await import("@/lib/supabase");
  return supabase;
}

type StoredWorkspaceImage = {
  blob: Blob;
  createdAt: string;
  id: string;
  key: string;
  mimeType: string;
  name: string;
  size: number;
  userId: string;
};

export type WorkspaceImageAsset = Omit<StoredWorkspaceImage, "blob" | "key" | "userId"> & {
  cloudSynced: boolean;
  url: string;
};

export class WorkspaceAssetError extends Error {
  constructor(
    public readonly code:
      | "invalid-file"
      | "storage-unavailable"
      | "storage-failed",
    message: string
  ) {
    super(message);
    this.name = "WorkspaceAssetError";
  }
}

let databasePromise: Promise<IDBDatabase> | null = null;

export function workspaceImageUrl(assetId: string) {
  if (!isWorkspaceImageId(assetId)) {
    throw new WorkspaceAssetError("invalid-file", "Invalid workspace image id.");
  }
  return `${WORKSPACE_IMAGE_SCHEME}${assetId}`;
}

export function parseWorkspaceImageId(value: string | undefined) {
  if (!value) return null;
  const match = value.match(/^workspace-image:\/\/([a-zA-Z0-9_-]{8,128})$/);
  return match?.[1] ?? null;
}

function imageKey(userId: string, assetId: string) {
  return `${userId}:${assetId}`;
}

function cloudStateKey(userId: string) {
  return `${CLOUD_ASSET_STATE_PREFIX}:${encodeURIComponent(userId)}`;
}

function readCloudAssetIds(userId: string) {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const value = JSON.parse(window.localStorage.getItem(cloudStateKey(userId)) || "[]");
    return new Set(
      Array.isArray(value)
        ? value.filter((item): item is string =>
            typeof item === "string" && isWorkspaceImageId(item)
          )
        : []
    );
  } catch {
    return new Set<string>();
  }
}

function markCloudAsset(userId: string, assetId: string) {
  if (typeof window === "undefined") return;
  try {
    const ids = readCloudAssetIds(userId);
    ids.add(assetId);
    window.localStorage.setItem(cloudStateKey(userId), JSON.stringify([...ids]));
  } catch {
    // Cloud storage remains usable if local metadata is unavailable.
  }
}

function openDatabase() {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return Promise.reject(
      new WorkspaceAssetError(
        "storage-unavailable",
        "Image storage is unavailable in this browser."
      )
    );
  }

  if (databasePromise) return databasePromise;

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(IMAGE_STORE)) {
        const store = database.createObjectStore(IMAGE_STORE, { keyPath: "key" });
        store.createIndex("userId", "userId", { unique: false });
      }
    };

    request.onerror = () => {
      databasePromise = null;
      reject(
        new WorkspaceAssetError(
          "storage-failed",
          request.error?.message || "Could not open image storage."
        )
      );
    };

    request.onblocked = () => {
      databasePromise = null;
      reject(
        new WorkspaceAssetError(
          "storage-failed",
          "Image storage is blocked by another Scriptic session."
        )
      );
    };

    request.onsuccess = () => {
      const database = request.result;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };
  });

  return databasePromise;
}

function matchesImageSignature(type: string, bytes: Uint8Array) {
  if (type === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((byte, index) => bytes[index] === byte);
  }
  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (type === "image/gif") {
    const header = String.fromCharCode(...bytes.slice(0, 6));
    return header === "GIF87a" || header === "GIF89a";
  }
  if (type === "image/webp") {
    return (
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }
  return false;
}

async function validateImage(file: File) {
  if (!allowedImageTypes.has(file.type)) {
    throw new WorkspaceAssetError(
      "invalid-file",
      "Choose a PNG, JPEG, WebP, or GIF image."
    );
  }
  if (!file.size || file.size > MAX_WORKSPACE_IMAGE_BYTES) {
    throw new WorkspaceAssetError(
      "invalid-file",
      `Images must be smaller than ${MAX_WORKSPACE_IMAGE_BYTES / 1024 / 1024} MB.`
    );
  }

  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (!matchesImageSignature(file.type, bytes)) {
    throw new WorkspaceAssetError(
      "invalid-file",
      "The selected file does not match its image format."
    );
  }
}

async function putLocalWorkspaceImage(stored: StoredWorkspaceImage) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE, "readwrite");
    transaction.objectStore(IMAGE_STORE).put(stored);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        new WorkspaceAssetError(
          "storage-failed",
          transaction.error?.message || "Could not save the image."
        )
      );
    transaction.onabort = transaction.onerror;
  });
}

export async function getLocalWorkspaceImage(userId: string, assetId: string) {
  if (!userId || !isWorkspaceImageId(assetId)) return null;
  const database = await openDatabase();

  return new Promise<Blob | null>((resolve, reject) => {
    const transaction = database.transaction(IMAGE_STORE, "readonly");
    const request = transaction
      .objectStore(IMAGE_STORE)
      .get(imageKey(userId, assetId));
    request.onsuccess = () => {
      const stored = request.result as StoredWorkspaceImage | undefined;
      resolve(stored?.blob ?? null);
    };
    request.onerror = () =>
      reject(
        new WorkspaceAssetError(
          "storage-failed",
          request.error?.message || "Could not load the image."
        )
      );
  });
}

async function accessTokenForUser(userId: string) {
  const supabase = await workspaceSupabase();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session?.access_token || session.user.id !== userId) {
    throw new WorkspaceAssetError(
      "storage-unavailable",
      "Sign in again to synchronize this image."
    );
  }
  return session.access_token;
}

async function cloudRequest<T>(userId: string, path: string, init?: RequestInit) {
  const accessToken = await accessTokenForUser(userId);
  const response = await fetch(path, {
    ...init,
    cache: "no-store",
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const value = (await response.json().catch(() => null)) as T | null;
  if (!response.ok || !value) {
    const errorMessage =
      value && typeof value === "object" && "error" in value
        ? String(value.error)
        : "Image storage is temporarily unavailable.";
    throw new WorkspaceAssetError("storage-failed", errorMessage);
  }
  return value;
}

export async function syncWorkspaceImage(
  userId: string,
  assetId: string,
  blob: Blob
) {
  if (
    !userId ||
    !isWorkspaceImageId(assetId) ||
    !isWorkspaceImageMimeType(blob.type) ||
    !blob.size ||
    blob.size > MAX_WORKSPACE_IMAGE_BYTES
  ) {
    throw new WorkspaceAssetError("invalid-file", "Invalid workspace image.");
  }

  const ticket = await cloudRequest<{ path: string; token: string }>(
    userId,
    "/api/workspace/assets",
    {
      method: "POST",
      body: JSON.stringify({ assetId, mimeType: blob.type, size: blob.size }),
    }
  );
  if (!ticket.path || !ticket.token) {
    throw new WorkspaceAssetError("storage-failed", "Invalid upload ticket.");
  }
  const supabase = await workspaceSupabase();
  const { error } = await supabase.storage
    .from(WORKSPACE_IMAGE_BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, blob, {
      cacheControl: "31536000",
      contentType: blob.type,
    });
  if (error) {
    throw new WorkspaceAssetError("storage-failed", error.message);
  }
  markCloudAsset(userId, assetId);
}

export async function saveWorkspaceImage(userId: string, file: File) {
  if (!userId) {
    throw new WorkspaceAssetError("storage-unavailable", "Sign in to upload images.");
  }
  await validateImage(file);

  const id = crypto.randomUUID();
  const stored: StoredWorkspaceImage = {
    blob: file,
    createdAt: new Date().toISOString(),
    id,
    key: imageKey(userId, id),
    mimeType: file.type,
    name: file.name.slice(0, 180),
    size: file.size,
    userId,
  };

  await putLocalWorkspaceImage(stored);

  let cloudSynced = false;
  try {
    await syncWorkspaceImage(userId, id, file);
    cloudSynced = true;
  } catch {
    // The local copy stays available and the workspace sync retries it later.
  }

  return {
    cloudSynced,
    createdAt: stored.createdAt,
    id: stored.id,
    mimeType: stored.mimeType,
    name: stored.name,
    size: stored.size,
    url: workspaceImageUrl(stored.id),
  } satisfies WorkspaceImageAsset;
}

export async function getWorkspaceImage(userId: string, assetId: string) {
  if (!userId || !isWorkspaceImageId(assetId)) return null;
  try {
    const local = await getLocalWorkspaceImage(userId, assetId);
    if (local) return local;
  } catch {
    // A cloud copy can still be loaded when IndexedDB is unavailable.
  }

  try {
    const ticket = await cloudRequest<{ url: string }>(
      userId,
      `/api/workspace/assets/${encodeURIComponent(assetId)}`
    );
    if (!ticket.url) return null;
    const response = await fetch(ticket.url, { cache: "no-store" });
    if (!response.ok) return null;
    const blob = await response.blob();
    if (
      !isWorkspaceImageMimeType(blob.type) ||
      !blob.size ||
      blob.size > MAX_WORKSPACE_IMAGE_BYTES
    ) {
      return null;
    }
    markCloudAsset(userId, assetId);
    try {
      await putLocalWorkspaceImage({
        blob,
        createdAt: new Date().toISOString(),
        id: assetId,
        key: imageKey(userId, assetId),
        mimeType: blob.type,
        name: `workspace-image-${assetId}`,
        size: blob.size,
        userId,
      });
    } catch {
      // Rendering can continue directly from the downloaded blob.
    }
    return blob;
  } catch {
    return null;
  }
}

export async function syncWorkspaceImagesForNotes(
  userId: string,
  notes: Array<{ content: string }>
) {
  const ids = new Set<string>();
  for (const note of notes) {
    for (const match of note.content.matchAll(/workspace-image:\/\/([a-zA-Z0-9_-]{8,128})/g)) {
      ids.add(match[1]);
    }
  }

  const cloudIds = readCloudAssetIds(userId);
  let synced = 0;
  for (const assetId of [...ids].filter((id) => !cloudIds.has(id)).slice(0, 20)) {
    let blob: Blob | null = null;
    try {
      blob = await getLocalWorkspaceImage(userId, assetId);
    } catch {
      continue;
    }
    if (!blob) continue;
    await syncWorkspaceImage(userId, assetId, blob);
    synced += 1;
  }
  return synced;
}

const DATABASE_NAME = "scripticx-workspace-assets";
const DATABASE_VERSION = 1;
const IMAGE_STORE = "images";

export const WORKSPACE_IMAGE_SCHEME = "workspace-image://";
export const MAX_WORKSPACE_IMAGE_BYTES = 8 * 1024 * 1024;

const allowedImageTypes = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

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
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(assetId)) {
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

export async function saveWorkspaceImage(userId: string, file: File) {
  if (!userId) {
    throw new WorkspaceAssetError("storage-unavailable", "Sign in to upload images.");
  }
  await validateImage(file);

  const database = await openDatabase();
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

  return {
    createdAt: stored.createdAt,
    id: stored.id,
    mimeType: stored.mimeType,
    name: stored.name,
    size: stored.size,
    url: workspaceImageUrl(stored.id),
  } satisfies WorkspaceImageAsset;
}

export async function getWorkspaceImage(userId: string, assetId: string) {
  if (!userId || !parseWorkspaceImageId(`${WORKSPACE_IMAGE_SCHEME}${assetId}`)) {
    return null;
  }
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

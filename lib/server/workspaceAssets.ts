import "server-only";

import { createAdminSupabase } from "@/lib/supabaseServer";
import {
  MAX_WORKSPACE_IMAGE_BYTES,
  WORKSPACE_IMAGE_BUCKET,
  WORKSPACE_IMAGE_MIME_TYPES,
} from "@/lib/workspace-asset-contract";

let bucketPromise: Promise<void> | null = null;

function isAlreadyExistsError(message: string) {
  return /already exists|duplicate/i.test(message);
}

export function ensureWorkspaceImageBucket() {
  if (bucketPromise) return bucketPromise;

  bucketPromise = (async () => {
    const admin = createAdminSupabase();
    const { data, error } = await admin.storage.getBucket(WORKSPACE_IMAGE_BUCKET);
    if (data) return;
    if (error && !/not found/i.test(error.message)) throw error;

    const { error: createError } = await admin.storage.createBucket(
      WORKSPACE_IMAGE_BUCKET,
      {
        public: false,
        fileSizeLimit: MAX_WORKSPACE_IMAGE_BYTES,
        allowedMimeTypes: [...WORKSPACE_IMAGE_MIME_TYPES],
      }
    );
    if (createError && !isAlreadyExistsError(createError.message)) {
      throw createError;
    }
  })().catch((error) => {
    bucketPromise = null;
    throw error;
  });

  return bucketPromise;
}

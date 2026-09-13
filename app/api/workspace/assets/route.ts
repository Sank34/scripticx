import { NextResponse } from "next/server";

import {
  enforceRateLimit,
  HttpError,
  jsonObject,
  readJsonBody,
  requireUser,
} from "@/lib/server/requestSecurity";
import { ensureWorkspaceImageBucket } from "@/lib/server/workspaceAssets";
import { createAdminSupabase } from "@/lib/supabaseServer";
import {
  isWorkspaceImageId,
  isWorkspaceImageMimeType,
  MAX_WORKSPACE_IMAGE_BYTES,
  workspaceImageObjectPath,
  WORKSPACE_IMAGE_BUCKET,
} from "@/lib/workspace-asset-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    await enforceRateLimit({
      key: user.id,
      action: "workspace_image_upload",
      limit: 60,
      windowSeconds: 60 * 60,
    });
    const body = jsonObject(await readJsonBody(request, 2_000));
    const assetId = typeof body.assetId === "string" ? body.assetId : "";
    const mimeType = body.mimeType;
    const size = typeof body.size === "number" ? body.size : Number.NaN;

    if (
      !isWorkspaceImageId(assetId) ||
      !isWorkspaceImageMimeType(mimeType) ||
      !Number.isSafeInteger(size) ||
      size < 1 ||
      size > MAX_WORKSPACE_IMAGE_BYTES
    ) {
      throw new HttpError(400, "Invalid image metadata");
    }

    await ensureWorkspaceImageBucket();
    const path = workspaceImageObjectPath(user.id, assetId);
    const { data, error } = await createAdminSupabase()
      .storage.from(WORKSPACE_IMAGE_BUCKET)
      .createSignedUploadUrl(path, { upsert: true });
    if (error || !data?.token) {
      console.error("Could not sign workspace image upload:", error);
      throw new HttpError(503, "Image storage is temporarily unavailable");
    }

    return NextResponse.json({ path, token: data.token });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Could not prepare workspace image upload:", error);
    return NextResponse.json(
      { error: "Could not prepare image upload" },
      { status: 500 }
    );
  }
}

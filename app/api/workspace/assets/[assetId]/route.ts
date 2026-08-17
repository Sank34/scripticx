import { NextResponse } from "next/server";

import { HttpError, requireUser } from "@/lib/server/requestSecurity";
import { ensureWorkspaceImageBucket } from "@/lib/server/workspaceAssets";
import { createAdminSupabase } from "@/lib/supabaseServer";
import {
  isWorkspaceImageId,
  workspaceImageObjectPath,
  WORKSPACE_IMAGE_BUCKET,
} from "@/lib/workspace-asset-contract";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ assetId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { user } = await requireUser(request);
    const { assetId } = await context.params;
    if (!isWorkspaceImageId(assetId)) {
      throw new HttpError(400, "Invalid image id");
    }

    await ensureWorkspaceImageBucket();
    const path = workspaceImageObjectPath(user.id, assetId);
    const { data, error } = await createAdminSupabase()
      .storage.from(WORKSPACE_IMAGE_BUCKET)
      .createSignedUrl(path, 60);
    if (error || !data?.signedUrl) {
      if (error) console.error("Could not sign workspace image download:", error);
      throw new HttpError(404, "Image not found");
    }

    return NextResponse.json({ url: data.signedUrl });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Could not prepare workspace image download:", error);
    return NextResponse.json(
      { error: "Could not load image" },
      { status: 500 }
    );
  }
}

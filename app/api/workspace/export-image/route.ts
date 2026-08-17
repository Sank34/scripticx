import { NextResponse } from "next/server";

import {
  enforceRateLimit,
  HttpError,
  jsonObject,
  readJsonBody,
  requireUser,
  stringField,
} from "@/lib/server/requestSecurity";
import { fetchPublicImage } from "@/lib/server/externalImage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    await enforceRateLimit({
      action: "workspace_export_image_burst",
      key: user.id,
      limit: 40,
      windowSeconds: 60,
    });
    await enforceRateLimit({
      action: "workspace_export_image",
      key: user.id,
      limit: 120,
      windowSeconds: 60 * 60,
    });
    const body = jsonObject(await readJsonBody(request, 4_096));
    const url = stringField(body.url, { max: 2_048, min: 1 });
    const image = await fetchPublicImage(url);
    const responseBody = image.bytes.buffer.slice(
      image.bytes.byteOffset,
      image.bytes.byteOffset + image.bytes.byteLength
    ) as ArrayBuffer;
    return new Response(responseBody, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Type": image.mimeType,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(
      "Could not prepare external note image:",
      error instanceof Error ? error.message : "Unknown image proxy error"
    );
    return NextResponse.json({ error: "Could not load external image" }, { status: 422 });
  }
}

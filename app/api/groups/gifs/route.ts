import { NextResponse } from "next/server";
import { enforceRateLimit, HttpError, requireUser } from "@/lib/server/requestSecurity";

export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    const key = process.env.KLIPY_API_KEY;
    if (!key) return NextResponse.json({ error: "GIF search is not configured. You can upload a GIF or paste its link." }, { status: 503 });
    await enforceRateLimit({ key: user.id, action: "group-gif-search", limit: 40, windowSeconds: 60 });
    const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) || "";
    const params = new URLSearchParams({ key, limit: "20", contentfilter: "medium", media_filter: "tinygif,mediumgif" });
    if (query) params.set("q", query);
    const response = await fetch(`https://api.klipy.com/v2/${query ? "search" : "featured"}?${params}`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!response.ok) throw new Error("GIF provider unavailable");
    const payload = await response.json();
    const results = (payload.results ?? []).flatMap((item: { id?: string; title?: string; content_description?: string; media_formats?: { mediumgif?: { url?: string }; tinygif?: { url?: string } } }) => {
      const url = item.media_formats?.mediumgif?.url ?? item.media_formats?.tinygif?.url;
      const preview = item.media_formats?.tinygif?.url ?? url;
      return item.id && url?.startsWith("https://") && preview?.startsWith("https://") ? [{ id: item.id, url, preview, title: item.content_description || item.title || "GIF" }] : [];
    });
    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: error instanceof HttpError ? error.message : "GIF search is temporarily unavailable." }, { status: error instanceof HttpError ? error.status : 502 });
  }
}

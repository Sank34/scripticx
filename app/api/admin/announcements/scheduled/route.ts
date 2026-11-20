import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { announcementItemLimit, isAnnouncementUrl } from "@/lib/scheduled-announcements";
import { HttpError, jsonObject, readJsonBody, requireAdmin, stringField } from "@/lib/server/requestSecurity";
import { createAdminSupabase } from "@/lib/supabaseServer";

function handleError(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error("Scheduled announcements request failed:", error);
  return NextResponse.json({ error: "Could not complete the announcement request." }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { data, error } = await createAdminSupabase().from("scheduled_announcements")
      .select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return handleError(error);
  }
}

function items(value: unknown) {
  if (!Array.isArray(value) || value.length > announcementItemLimit) throw new HttpError(400, "Too many images or buttons.");
  return value.map(jsonObject);
}

function date(value: unknown) {
  const text = stringField(value, { min: 24, max: 24 });
  const result = new Date(text);
  if (!Number.isFinite(result.getTime()) || result.toISOString() !== text) throw new HttpError(400, "Invalid schedule.");
  return result;
}

async function uploadImage(request: Request) {
  const length = Number(request.headers.get("content-length"));
  if (length > 3 * 1024 * 1024 + 16_384) throw new HttpError(413, "Image exceeds 3 MB.");
  const file = (await request.formData()).get("image");
  if (!(file instanceof File) || !file.size || file.size > 3 * 1024 * 1024) throw new HttpError(400, "Choose an image up to 3 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ascii = new TextDecoder();
  const format = bytes[0] === 0x89 && ascii.decode(bytes.subarray(1, 4)) === "PNG" ? "png"
    : bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff ? "jpeg"
    : /^GIF8[79]a$/.test(ascii.decode(bytes.subarray(0, 6))) ? "gif"
    : ascii.decode(bytes.subarray(0, 4)) === "RIFF" && ascii.decode(bytes.subarray(8, 12)) === "WEBP" ? "webp"
    : null;
  if (!format) throw new HttpError(400, "Use a PNG, JPEG, WebP, or GIF image.");
  const bucket = createAdminSupabase().storage.from("announcement-images");
  const path = `${randomUUID()}.${format}`;
  const { error } = await bucket.upload(path, bytes, { contentType: `image/${format}`, upsert: false });
  if (error) throw error;
  return NextResponse.json({ src: bucket.getPublicUrl(path).data.publicUrl }, { status: 201 });
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    if (request.headers.get("content-type")?.startsWith("multipart/form-data")) return await uploadImage(request);

    const draft = jsonObject(await readJsonBody(request, 20_000));
    const title = stringField(draft.title, { min: 2, max: 160 });
    const body = stringField(draft.body, { min: 2, max: 2000 });
    const startsAt = date(draft.starts_at);
    const endsAt = date(draft.ends_at);
    if (endsAt <= startsAt || endsAt.getTime() <= Date.now()) throw new HttpError(400, "Choose an end time after the start and in the future.");
    const images = items(draft.images).map((image) => {
      const src = stringField(image.src, { min: 1, max: 500 });
      if (!isAnnouncementUrl(src)) throw new HttpError(400, "Use a secure image URL.");
      return { src, alt: stringField(image.alt, { max: 160 }) };
    });
    const buttons = items(draft.buttons).map((button) => {
      const href = stringField(button.href, { min: 1, max: 500 });
      if (!isAnnouncementUrl(href, true)) throw new HttpError(400, "Use an internal path or a secure button URL.");
      return { href, label: stringField(button.label, { min: 1, max: 48 }) };
    });

    const { error } = await createAdminSupabase().from("scheduled_announcements").insert({
      title, body, images, buttons, show_mascots: draft.show_mascots === true,
      starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString(),
    });
    if (error) throw error;
    return NextResponse.json({ created: true }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin(request);
    const body = jsonObject(await readJsonBody(request, 1000));
    const id = stringField(body.id, { min: 36, max: 36 });
    if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) throw new HttpError(400, "Invalid announcement ID.");
    const { error } = await createAdminSupabase().from("scheduled_announcements")
      .update({ disabled_at: new Date().toISOString() }).eq("id", id).is("disabled_at", null);
    if (error) throw error;
    return NextResponse.json({ disabled: true });
  } catch (error) {
    return handleError(error);
  }
}

import { NextResponse } from "next/server";

import { absoluteUrl } from "@/lib/metadata";
import { verifyUnsubscribeToken } from "@/lib/mail/unsubscribe";
import { createAdminSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function page(title: string, message: string, token?: string) {
  const action = token
    ? `<form method="post" action="/api/mail/unsubscribe?token=${encodeURIComponent(token)}"><button type="submit" style="border:0;border-radius:10px;background:#111827;color:#fff;padding:12px 18px;font:600 14px Inter,sans-serif;cursor:pointer">Confirm unsubscribe</button></form>`
    : `<a href="${absoluteUrl("/settings")}" style="display:inline-block;border-radius:10px;background:#111827;color:#fff;padding:12px 18px;text-decoration:none;font-weight:600">Open ScripticX</a>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#f6f7fb;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0f172a"><main style="max-width:560px;margin:64px auto;padding:0 18px"><img src="${absoluteUrl("/scripticx-logo-lung.png")}" width="150" alt="ScripticX"><section style="margin-top:24px;border:1px solid #e5e7eb;border-radius:18px;background:#fff;padding:34px;box-shadow:0 10px 30px rgba(15,23,42,.06)"><h1 style="margin:0 0 12px;font-size:28px">${title}</h1><p style="margin:0 0 24px;color:#475569;line-height:1.7">${message}</p>${action}</section></main></body></html>`;
}

function htmlResponse(html: string, status = 200) {
  return new NextResponse(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  if (!verifyUnsubscribeToken(token)) {
    return htmlResponse(page("Link unavailable", "This unsubscribe link is invalid or has expired."), 400);
  }
  // GET only asks for confirmation. Mail security scanners commonly follow
  // links, so changing preferences here would unsubscribe users accidentally.
  return htmlResponse(page("Unsubscribe from emails?", "Confirm below. Account and security emails will still be delivered.", token));
}

export async function POST(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const payload = verifyUnsubscribeToken(token);
  if (!payload) {
    return htmlResponse(page("Link unavailable", "This unsubscribe link is invalid or has expired."), 400);
  }

  const column = payload.category === "newsletter" ? "newsletter" : "product_updates";
  const admin = createAdminSupabase();
  const { error: insertError } = await admin.from("email_preferences").upsert(
    { user_id: payload.userId, [column]: false },
    { onConflict: "user_id", ignoreDuplicates: true }
  );
  if (insertError) {
    console.error("Could not initialize unsubscribe preference:", insertError);
    return htmlResponse(page("Try again", "We could not update your preference right now."), 503);
  }
  const { error } = await admin
    .from("email_preferences")
    .update({
      [column]: false,
      marketing_unsubscribed_at: new Date().toISOString(),
    })
    .eq("user_id", payload.userId);
  if (error) {
    console.error("Could not unsubscribe email recipient:", error);
    return htmlResponse(page("Try again", "We could not update your preference right now."), 503);
  }
  return htmlResponse(page("You are unsubscribed", "Your marketing preference was updated. Security and account emails remain enabled."));
}


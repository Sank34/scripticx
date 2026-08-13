import { NextResponse } from "next/server";

import { absoluteUrl } from "@/lib/metadata";
import { renderEmail } from "@/lib/mail/render";
import {
  mailContent,
  mailMode,
  mailSubject,
  optionalText,
  safeActionUrl,
  senderName,
} from "@/lib/mail/validation";
import { assertSupportedMailVariables, interpolateMailVariables } from "@/lib/mail/variables";
import { HttpError, jsonObject, readJsonBody, requireAdmin } from "@/lib/server/requestSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    await requireAdmin(request);
    const body = jsonObject(await readJsonBody(request, 110_000));
    const subjectSource = mailSubject(body.subject);
    const preheaderSource = optionalText(body.preheader, 240);
    const contentSource = mailContent(body.content);
    const actionLabel = optionalText(body.actionLabel ?? body.buttonLabel, 80);
    const actionUrl = safeActionUrl(body.actionUrl ?? body.buttonUrl);
    assertSupportedMailVariables(subjectSource, preheaderSource, contentSource, actionLabel, actionUrl);
    const variables = {
      first_name: "Andrei",
      username: "andrei",
      email: "andrei@example.com",
      action_url: "",
      unsubscribe_url: absoluteUrl("/settings"),
    };
    const previewActionCandidate = actionUrl
      ? interpolateMailVariables(actionUrl, variables)
      : "";
    const previewActionValidated = previewActionCandidate
      ? safeActionUrl(previewActionCandidate) || ""
      : "";
    variables.action_url = previewActionValidated.startsWith("/")
      ? absoluteUrl(previewActionValidated)
      : previewActionValidated;
    const result = renderEmail({
      subject: interpolateMailVariables(subjectSource, variables),
      preheader: preheaderSource ? interpolateMailVariables(preheaderSource, variables) : null,
      content: interpolateMailVariables(contentSource, variables),
      mode: mailMode(body.mode),
      locale: body.locale === "ro" ? "ro" : "en",
      senderName: body.senderName === undefined ? "ScripticX" : senderName(body.senderName),
      actionLabel: actionLabel ? interpolateMailVariables(actionLabel, variables) : null,
      actionUrl: variables.action_url || null,
      unsubscribeUrl: variables.unsubscribe_url,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof HttpError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Could not render email preview:", error);
    return NextResponse.json({ error: "Could not render email preview" }, { status: 500 });
  }
}

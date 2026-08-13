import { absoluteUrl } from "@/lib/metadata";
import type { MailMode } from "@/lib/mail/types";

export type RenderEmailInput = {
  subject: string;
  preheader?: string | null;
  content: string;
  mode: MailMode;
  locale?: "ro" | "en";
  senderName?: string;
  actionLabel?: string | null;
  actionUrl?: string | null;
  unsubscribeUrl?: string | null;
};

export function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function paragraphHtml(content: string) {
  return content
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => {
      const safe = escapeEmailHtml(paragraph).replaceAll("\n", "<br>");
      return `<p style="margin:0 0 18px;color:#334155;font-size:16px;line-height:1.7;">${safe}</p>`;
    })
    .join("");
}

export function renderEmail(input: RenderEmailInput): { html: string | null; text: string } {
  const ro = input.locale === "ro";
  const sender = input.senderName?.trim() || "ScripticX";
  const action = input.actionLabel && input.actionUrl
    ? `\n\n${input.actionLabel}: ${input.actionUrl}`
    : "";
  const unsubscribe = input.unsubscribeUrl
    ? `\n\n${ro ? "Dezabonare de la emailurile de marketing" : "Unsubscribe from marketing emails"}: ${input.unsubscribeUrl}`
    : "";
  const text = `${input.subject}\n\n${input.content.trim()}${action}${unsubscribe}\n\n— ${sender}`;

  if (input.mode === "plain") return { html: null, text };

  const subject = escapeEmailHtml(input.subject);
  const preheader = escapeEmailHtml(input.preheader || input.subject);
  const actionHtml = input.actionLabel && input.actionUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;"><tr><td style="border-radius:10px;background:#111827;"><a href="${escapeEmailHtml(input.actionUrl)}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">${escapeEmailHtml(input.actionLabel)}</a></td></tr></table>`
    : "";
  const unsubscribeHtml = input.unsubscribeUrl
    ? `<p style="margin:14px 0 0;color:#94a3b8;font-size:12px;line-height:1.6;">${ro ? "Primești acest mesaj deoarece te-ai abonat la emailurile ScripticX." : "You receive this because you subscribed to ScripticX emails."} <a href="${escapeEmailHtml(input.unsubscribeUrl)}" style="color:#64748b;">${ro ? "Dezabonare" : "Unsubscribe"}</a>.</p>`
    : "";
  const logoUrl = absoluteUrl("/scripticx-logo-lung.png");

  const html = `<!doctype html>
<html lang="${ro ? "ro" : "en"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;background:#f6f7fb;color:#0f172a;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f7fb;padding:32px 12px;"><tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;">
    <tr><td style="padding:0 8px 20px;"><img src="${logoUrl}" width="150" alt="ScripticX" style="display:block;height:auto;border:0;"></td></tr>
    <tr><td style="overflow:hidden;border:1px solid #e5e7eb;border-radius:18px;background:#ffffff;box-shadow:0 10px 30px rgba(15,23,42,.06);">
      <div style="height:5px;background:linear-gradient(90deg,#0ea5e9,#6366f1,#8b5cf6);"></div>
      <div style="padding:38px 38px 32px;">
        <p style="margin:0 0 10px;color:#6366f1;font-size:13px;font-weight:700;">${escapeEmailHtml(sender)}</p>
        <h1 style="margin:0 0 24px;color:#0f172a;font-size:29px;line-height:1.2;letter-spacing:-.025em;">${subject}</h1>
        ${paragraphHtml(input.content)}
        ${actionHtml}
      </div>
    </td></tr>
    <tr><td style="padding:20px 10px;text-align:center;color:#94a3b8;font-size:12px;line-height:1.6;">
      <p style="margin:0;">${ro ? "Învață, construiește și evoluează cu ScripticX." : "Learn, build and grow with ScripticX."}</p>
      ${unsubscribeHtml}
      <p style="margin:8px 0 0;">© ${new Date().getUTCFullYear()} ScripticX</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

  return { html, text };
}

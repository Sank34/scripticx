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
  const paragraphs = content.trim().split(/\n{2,}/);
  return paragraphs
    .map((paragraph, index) => {
      const safe = escapeEmailHtml(paragraph).replaceAll("\n", "<br>");
      const margin = index === paragraphs.length - 1 ? "0" : "0 0 20px";
      return `<p class="email-paragraph" style="margin:${margin};color:#3a3a3c;font-size:17px;line-height:1.65;font-weight:400;">${safe}</p>`;
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
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:32px 0 0;"><tr><td class="email-button" bgcolor="#1d1d1f" style="border-radius:999px;background:#1d1d1f;"><a href="${escapeEmailHtml(input.actionUrl)}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-size:15px;line-height:20px;font-weight:600;">${escapeEmailHtml(input.actionLabel)}&nbsp;&nbsp;›</a></td></tr></table>`
    : "";
  const unsubscribeHtml = input.unsubscribeUrl
    ? `<p style="margin:10px 0 0;color:#86868b;font-size:12px;line-height:1.55;">${ro ? "Primești acest mesaj deoarece te-ai abonat la emailurile ScripticX." : "You receive this because you subscribed to ScripticX emails."} <a href="${escapeEmailHtml(input.unsubscribeUrl)}" style="color:#515154;text-decoration:underline;">${ro ? "Dezabonare" : "Unsubscribe"}</a>.</p>`
    : "";
  const logoUrl = absoluteUrl("/scripticx-logo-lung.png");

  const html = `<!doctype html>
<html lang="${ro ? "ro" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <title>${subject}</title>
  <style>
    html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    table { border-collapse: separate; border-spacing: 0; }
    img { border: 0; line-height: 100%; }
    a { color: inherit; }
    @media only screen and (max-width: 620px) {
      .email-page { padding: 28px 12px 32px !important; }
      .email-logo { padding: 0 12px 18px !important; }
      .email-card { border-radius: 22px !important; }
      .email-content { padding: 38px 26px 34px !important; }
      .email-title { font-size: 31px !important; line-height: 1.12 !important; letter-spacing: -0.5px !important; }
      .email-meta { padding: 20px 26px !important; }
      .email-footer { padding-left: 18px !important; padding-right: 18px !important; }
    }
  </style>
</head>
<body style="margin:0;background:#f5f5f7;color:#1d1d1f;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text','SF Pro Display','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${preheader}&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;</div>
<table class="email-page" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#f5f5f7" style="width:100%;background:#f5f5f7;padding:44px 16px 40px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;">
      <tr><td class="email-logo" align="center" style="padding:0 16px 24px;">
        <img src="${logoUrl}" width="142" alt="ScripticX" style="display:block;width:142px;max-width:100%;height:auto;">
      </td></tr>
      <tr><td>
        <table class="email-card" role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="width:100%;overflow:hidden;border:1px solid #e5e5e7;border-radius:28px;background:#ffffff;box-shadow:0 12px 34px rgba(0,0,0,0.045);">
          <tr><td class="email-content" style="padding:52px 56px 48px;">
            <p style="margin:0 0 18px;color:#6e6e73;font-size:13px;line-height:1.4;font-weight:600;">${escapeEmailHtml(sender)}</p>
            <h1 class="email-title" style="margin:0 0 28px;color:#1d1d1f;font-size:38px;line-height:1.08;letter-spacing:-0.8px;font-weight:700;">${subject}</h1>
            ${paragraphHtml(input.content)}
            ${actionHtml}
          </td></tr>
          <tr><td class="email-meta" style="border-top:1px solid #ececee;padding:22px 56px;background:#fbfbfd;color:#6e6e73;font-size:12px;line-height:1.55;">
            ${ro ? "Creat cu grijă de echipa ScripticX pentru următorul tău pas." : "Thoughtfully made by ScripticX for whatever you build next."}
          </td></tr>
        </table>
      </td></tr>
      <tr><td class="email-footer" align="center" style="padding:24px 24px 0;color:#86868b;font-size:12px;line-height:1.55;text-align:center;">
        <p style="margin:0;">${ro ? "Învață. Construiește. Evoluează." : "Learn. Build. Grow."}</p>
        ${unsubscribeHtml}
        <p style="margin:10px 0 0;">© ${new Date().getUTCFullYear()} ScripticX</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  return { html, text };
}

import "server-only";

import { createHash } from "node:crypto";

import { HttpError } from "@/lib/server/requestSecurity";

type VerificationLocale = "en" | "ro";

export async function sendMobileVerificationEmail(input: {
  actionLink: string;
  email: string;
  locale: VerificationLocale;
  userId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new HttpError(503, "Email delivery is not configured");

  const ro = input.locale === "ro";
  const subject = ro
    ? "Confirmă contul tău ScripticX"
    : "Confirm your ScripticX account";
  const preheader = ro
    ? "Confirmă adresa de email și continuă configurarea în aplicație."
    : "Confirm your email address and continue setup in the app.";
  const safeActionLink = escapeHtml(input.actionLink);
  const safeEmail = escapeHtml(input.email);
  const html = `<!doctype html>
<html lang="${input.locale}">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
  <body style="margin:0;background:#f5f5f5;color:#111;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#f5f5f5;padding:40px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px">
          <tr><td style="padding:0 4px 22px"><img src="https://platform.scripticx.org/scripticx-logo-lung.png" width="142" alt="ScripticX" style="display:block;height:auto;border:0"></td></tr>
          <tr><td style="border:1px solid #e4e4e7;border-radius:16px;background:#fff;box-shadow:0 12px 32px rgba(0,0,0,.05)">
            <div style="padding:42px 40px 38px">
              <p style="margin:0 0 14px;color:#71717a;font-size:13px;font-weight:600;line-height:1.5">${ro ? "Securitatea contului" : "Account security"}</p>
              <h1 style="margin:0;color:#111;font-size:30px;font-weight:700;line-height:1.2">${ro ? "Confirmă adresa de email" : "Confirm your email address"}</h1>
              <p style="margin:22px 0 0;color:#3f3f46;font-size:16px;line-height:1.7">${ro ? `Am primit o cerere de creare a unui cont ScripticX pentru <strong>${safeEmail}</strong>. Confirmă adresa, apoi revino în aplicație pentru onboarding.` : `We received a request to create a ScripticX account for <strong>${safeEmail}</strong>. Confirm the address, then return to the app for onboarding.`}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:30px 0 24px"><tr><td style="border-radius:10px;background:#111"><a href="${safeActionLink}" style="display:inline-block;padding:14px 22px;color:#fff;text-decoration:none;font-size:15px;font-weight:700;line-height:1.2">${ro ? "Confirmă emailul" : "Confirm email"}</a></td></tr></table>
              <p style="margin:0;color:#71717a;font-size:13px;line-height:1.65">${ro ? "Dacă nu ai creat acest cont, poți ignora mesajul." : "If you did not create this account, you can ignore this message."}</p>
            </div>
            <div style="border-top:1px solid #e4e4e7;padding:20px 40px;color:#a1a1aa;font-size:12px;line-height:1.6">${ro ? "Mesaj automat pentru securitatea contului." : "Automated account security message."}</div>
          </td></tr>
          <tr><td style="padding:20px 8px 0;text-align:center;color:#a1a1aa;font-size:12px;line-height:1.6">© 2026 ScripticX</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  const text = ro
    ? `Confirmă contul ScripticX pentru ${input.email}: ${input.actionLink}\n\nDacă nu ai creat acest cont, ignoră mesajul.`
    : `Confirm your ScripticX account for ${input.email}: ${input.actionLink}\n\nIf you did not create this account, ignore this message.`;
  const linkHash = createHash("sha256").update(input.actionLink).digest("hex").slice(0, 24);

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `mobile-verification/${input.userId}/${linkHash}`,
        "User-Agent": "ScripticX-Mobile-Auth/1.0",
      },
      body: JSON.stringify({
        from: "ScripticX <security@scripticx.org>",
        to: [input.email],
        subject,
        html,
        text,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    console.error("Resend mobile verification request failed:", error);
    throw new HttpError(502, "The confirmation email could not be delivered");
  }

  const payload = (await response.json().catch(() => null)) as
    | { id?: unknown; message?: unknown; name?: unknown }
    | null;
  if (!response.ok || typeof payload?.id !== "string") {
    console.error("Resend mobile verification delivery failed", {
      status: response.status,
      name: typeof payload?.name === "string" ? payload.name : null,
      message: typeof payload?.message === "string" ? payload.message.slice(0, 200) : null,
    });
    throw new HttpError(
      response.status === 429 ? 429 : 502,
      response.status === 429
        ? "Please wait before requesting another email"
        : "The confirmation email could not be delivered"
    );
  }

  return payload.id;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return replacements[character];
  });
}

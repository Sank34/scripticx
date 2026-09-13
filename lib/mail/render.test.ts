import { describe, expect, it } from "vitest";

import { renderEmail } from "@/lib/mail/render";

describe("renderEmail", () => {
  it("builds a responsive branded email and escapes untrusted content", () => {
    const result = renderEmail({
      subject: "Welcome <friend>",
      preheader: "Start learning",
      content: "Hello <script>alert('x')</script>\n\nYour workspace is ready.",
      mode: "html",
      locale: "en",
      senderName: "ScripticX Learning",
      actionLabel: "Open ScripticX",
      actionUrl: "https://platform.scripticx.org/dashboard",
      unsubscribeUrl: "https://platform.scripticx.org/api/mail/unsubscribe?token=safe",
    });

    expect(result.html).toContain("scripticx-logo-lung.png");
    expect(result.html).toContain("font-family:-apple-system");
    expect(result.html).toContain('class="email-card"');
    expect(result.html).toContain('content="light only"');
    expect(result.html).toContain("Thoughtfully made by ScripticX");
    expect(result.html).not.toContain("linear-gradient");
    expect(result.html).toContain("Welcome &lt;friend&gt;");
    expect(result.html).toContain("&lt;script&gt;alert(&#039;x&#039;)&lt;/script&gt;");
    expect(result.html).not.toContain("<script>alert");
    expect(result.html).not.toContain("List-Unsubscribe");
    expect(result.html).toContain("Open ScripticX&nbsp;&nbsp;›");
    expect(result.text).toContain("Open ScripticX: https://platform.scripticx.org/dashboard");
  });

  it("keeps the responsive layout compatible with narrow email clients", () => {
    const result = renderEmail({
      subject: "Un pas nou",
      preheader: "Continuă parcursul",
      content: "Salut!\n\nLecția ta este pregătită.",
      mode: "html",
      locale: "ro",
    });

    expect(result.html).toContain("@media only screen and (max-width: 620px)");
    expect(result.html).not.toContain("Previzualizare");
    expect(result.html).toContain("Continuă parcursul");
    expect(result.html).toContain("Creat cu grijă de echipa ScripticX");
    expect(result.html).toContain("Învață. Construiește. Evoluează.");
  });

  it("uses Romanian footer copy and returns text only in plain mode", () => {
    const result = renderEmail({
      subject: "Tema ta",
      content: "Ai o temă nouă.",
      mode: "plain",
      locale: "ro",
      unsubscribeUrl: "https://example.com/unsubscribe",
    });
    expect(result.html).toBeNull();
    expect(result.text).toContain("Dezabonare de la emailurile de marketing");
  });
});

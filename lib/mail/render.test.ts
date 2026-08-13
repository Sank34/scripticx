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
    expect(result.html).toContain("linear-gradient");
    expect(result.html).toContain("Welcome &lt;friend&gt;");
    expect(result.html).toContain("&lt;script&gt;alert(&#039;x&#039;)&lt;/script&gt;");
    expect(result.html).not.toContain("<script>alert");
    expect(result.html).not.toContain("List-Unsubscribe");
    expect(result.text).toContain("Open ScripticX: https://platform.scripticx.org/dashboard");
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

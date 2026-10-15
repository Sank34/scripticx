import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/LanguageProvider", () => ({
  useLanguage: () => ({ locale: "ro" }),
}));

import { ProblemAuthor } from "./ProblemAuthor";

const authorId = "12345678-abcd-1234-abcd-123456789abc";
const author = { id: authorId, username: "ana", avatar_url: null };

beforeEach(() => { vi.stubGlobal("React", React); });

describe("problem author attribution", () => {
  it("shows the author's avatar and profile link without exposing their ID", () => {
    const html = renderToStaticMarkup(React.createElement(ProblemAuthor, { authorId, author }));
    expect(html).toContain("Authored by");
    expect(html).toContain('href="/u/ana"');
    expect(html).not.toContain("12345678");
    expect(html).toContain("/avatars/default-pfp.svg");
  });

  it("avoids nested anchors inside the public problem row", () => {
    const html = renderToStaticMarkup(React.createElement("a", { href: "/problems/example" },
      React.createElement(ProblemAuthor, { authorId, author, linkProfile: false })));
    expect(html.match(/<a\b/g)).toHaveLength(1);
    expect(html).toContain("ana");
  });

  it("keeps unavailable profiles readable without a broken profile link", () => {
    const html = renderToStaticMarkup(React.createElement(ProblemAuthor, { authorId }));
    expect(html).toContain("Autor indisponibil");
    expect(html).not.toContain("12345678");
    expect(html).not.toContain("<a ");
  });

  it("does not invent attribution when the problem has no author", () => {
    expect(renderToStaticMarkup(React.createElement(ProblemAuthor, {}))).toBe("");
  });
});

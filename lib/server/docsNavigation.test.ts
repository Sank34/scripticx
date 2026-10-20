import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
vi.mock("server-only", () => ({}));

let fixture: string | undefined;
afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  if (fixture) rmSync(fixture, { recursive: true, force: true });
});

describe("automatic platform Docs navigation", () => {
  it.each(["docs", "examples"] as const)("discovers additions, drafts, translations, and deletions in %s", async (collection) => {
    fixture = mkdtempSync(path.join(tmpdir(), "scripticx-docs-"));
    const directory = path.join(fixture, `content/${collection}/ro/chapter`);
    mkdirSync(directory, { recursive: true });
    writeFileSync(path.join(directory, "_category_.json"), JSON.stringify({ label: "Capitol", position: 1 }));
    const page = (title: string, position: number, draft = false) => `---\ntitle: ${title}\nsidebar_position: ${position}\ndraft: ${draft}\n---\n\nContent`;
    writeFileSync(path.join(directory, "second.md"), page("A doua", 2));
    writeFileSync(path.join(directory, "first.md"), page("Prima", 1));
    writeFileSync(path.join(directory, "draft.md"), page("Ciornă", 0, true));
    vi.spyOn(process, "cwd").mockReturnValue(fixture);
    vi.resetModules();
    const docsModule = await import("./docs");
    const getPages = collection === "docs" ? docsModule.getDocsSidebarPages : docsModule.getExamplesSidebarPages;
    let navigation = getPages();
    expect(navigation.ro.map(item => item.title)).toEqual(["Prima", "A doua"]);
    expect(navigation.en).toEqual(navigation.ro);
    writeFileSync(path.join(directory, "new.md"), page("Nouă", 3));
    navigation = getPages();
    expect(navigation.ro.at(-1)).toMatchObject({ href: `/${collection}/chapter/new`, title: "Nouă" });
    const english = path.join(fixture, `content/${collection}/en`);
    mkdirSync(english, { recursive: true });
    writeFileSync(path.join(english, "translated.md"), "---\ntitle: First\nslug: /chapter/first\n---\nEnglish");
    navigation = getPages();
    expect(navigation.en.map(item => item.title)).toEqual(["First", "A doua", "Nouă"]);
    expect(navigation.ro.map(item => item.title)).toEqual(["Prima", "A doua", "Nouă"]);
    rmSync(path.join(directory, "new.md"));
    expect(getPages().ro.map(item => item.title)).toEqual(["Prima", "A doua"]);
  });
});

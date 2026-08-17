import { describe, expect, it } from "vitest";

import {
  DEFAULT_NOTE_IMAGE_PRESENTATION,
  NOTE_IMAGE_TITLE_PREFIX,
  normalizeNoteImagePresentation,
  parseNoteImageTitle,
  serializeNoteImageMarkdown,
  serializeNoteImageTitle,
} from "./note-image";

describe("normalizeNoteImagePresentation", () => {
  it("uses defaults for missing and invalid attributes", () => {
    expect(normalizeNoteImagePresentation(null)).toEqual(DEFAULT_NOTE_IMAGE_PRESENTATION);
    expect(
      normalizeNoteImagePresentation({ align: "justify", opacity: "nope", widthPercent: Infinity })
    ).toEqual(DEFAULT_NOTE_IMAGE_PRESENTATION);
  });

  it("keeps legacy image width automatic until the user resizes it", () => {
    expect(normalizeNoteImagePresentation({ widthPercent: null }).widthPercent).toBeNull();
    expect(normalizeNoteImagePresentation({ widthPercent: 65 }).widthPercent).toBe(65);
  });

  it("accepts editor string attributes and clamps supported percentages", () => {
    expect(
      normalizeNoteImagePresentation({ align: "right", opacity: "4", widthPercent: "108" })
    ).toEqual({ align: "right", opacity: 10, widthPercent: 100 });
    expect(
      normalizeNoteImagePresentation({ align: "left", opacity: 72.5, widthPercent: 12 })
    ).toEqual({ align: "left", opacity: 72.5, widthPercent: 20 });
  });
});

describe("note image Markdown title metadata", () => {
  it("preserves an ordinary title verbatim with default presentation", () => {
    expect(parseNoteImageTitle('  Demo "title"  ')).toEqual({
      ordinaryTitle: '  Demo "title"  ',
      presentation: DEFAULT_NOTE_IMAGE_PRESENTATION,
    });
    expect(parseNoteImageTitle(null)).toEqual({
      ordinaryTitle: null,
      presentation: DEFAULT_NOTE_IMAGE_PRESENTATION,
    });
  });

  it("keeps default Markdown titles free of reserved metadata", () => {
    expect(
      serializeNoteImageTitle({
        ...DEFAULT_NOTE_IMAGE_PRESENTATION,
        ordinaryTitle: "Class photo",
      })
    ).toBe("Class photo");
    expect(serializeNoteImageTitle(DEFAULT_NOTE_IMAGE_PRESENTATION)).toBeNull();
  });

  it("round-trips presentation and a safely encoded ordinary title", () => {
    const title = 'Photo (group); "final" / elevi 🎓';
    const serialized = serializeNoteImageTitle({
      align: "right",
      opacity: 63.75,
      ordinaryTitle: title,
      widthPercent: 48.5,
    });

    expect(serialized).toMatch(/^scripticx-image:v1;a=r;w=48\.5;o=63\.75;t=/);
    expect(serialized).not.toMatch(/[\s"']/);
    expect(parseNoteImageTitle(serialized)).toEqual({
      ordinaryTitle: title,
      presentation: { align: "right", opacity: 63.75, widthPercent: 48.5 },
    });
  });

  it("round-trips presentation without an ordinary title", () => {
    const serialized = serializeNoteImageTitle({
      align: "left",
      opacity: 80,
      widthPercent: 60,
    });

    expect(serialized).toBe(`${NOTE_IMAGE_TITLE_PREFIX}a=l;w=60;o=80`);
    expect(parseNoteImageTitle(serialized)).toEqual({
      ordinaryTitle: null,
      presentation: { align: "left", opacity: 80, widthPercent: 60 },
    });
  });

  it("clamps encoded values and handles malformed encoded titles without throwing", () => {
    expect(parseNoteImageTitle(`${NOTE_IMAGE_TITLE_PREFIX}a=r;w=999;o=-5;t=bad%value`)).toEqual({
      ordinaryTitle: null,
      presentation: { align: "right", opacity: 10, widthPercent: 100 },
    });
    expect(parseNoteImageTitle(`${NOTE_IMAGE_TITLE_PREFIX}unexpected-data`)).toEqual({
      ordinaryTitle: null,
      presentation: DEFAULT_NOTE_IMAGE_PRESENTATION,
    });
  });
});

describe("serializeNoteImageMarkdown", () => {
  it("escapes alt text and protects destinations containing parentheses", () => {
    expect(
      serializeNoteImageMarkdown({
        alt: "photo]final\\draft",
        src: "https://example.test/a).png",
        title: 'say "hello"',
      })
    ).toBe(String.raw`![photo\]final\\draft](<https://example.test/a).png> "say \"hello\"")`);
  });

  it("keeps workspace image destinations compact", () => {
    expect(
      serializeNoteImageMarkdown({
        alt: "Board",
        src: "workspace-image://abc12345",
        title: null,
      })
    ).toBe("![Board](workspace-image://abc12345)");
  });
});

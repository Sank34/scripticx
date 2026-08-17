export const NOTE_IMAGE_TITLE_PREFIX = "scripticx-image:v1;";

export type NoteImageAlignment = "left" | "center" | "right";

export type NoteImagePresentation = {
  align: NoteImageAlignment;
  opacity: number;
  widthPercent: number | null;
};

export type NoteImagePresentationInput = {
  align?: unknown;
  opacity?: unknown;
  widthPercent?: unknown;
};

export type ParsedNoteImageTitle = {
  ordinaryTitle: string | null;
  presentation: NoteImagePresentation;
};

export type SerializedNoteImageTitleInput = NoteImagePresentationInput & {
  ordinaryTitle?: string | null;
};

export const DEFAULT_NOTE_IMAGE_PRESENTATION: Readonly<NoteImagePresentation> = Object.freeze({
  align: "center",
  opacity: 100,
  widthPercent: null,
});

const ALIGNMENT_CODES: Record<NoteImageAlignment, string> = {
  center: "c",
  left: "l",
  right: "r",
};

const ALIGNMENTS_BY_CODE: Record<string, NoteImageAlignment> = {
  c: "center",
  l: "left",
  r: "right",
};

/**
 * Normalizes image presentation values read from editor attributes or Markdown.
 * Invalid values fall back to the visual editor defaults and numeric values are
 * clamped to the ranges supported by the image controls.
 */
export function normalizeNoteImagePresentation(
  input: NoteImagePresentationInput | null | undefined
): NoteImagePresentation {
  return {
    align: normalizeAlignment(input?.align),
    opacity: normalizePercentage(input?.opacity, 10),
    widthPercent: normalizeOptionalPercentage(input?.widthPercent, 20),
  };
}

/**
 * Reads ScripticX image presentation metadata from a Markdown image title.
 * Ordinary titles are kept verbatim and receive the default presentation.
 */
export function parseNoteImageTitle(title: unknown): ParsedNoteImageTitle {
  if (typeof title !== "string" || !title.startsWith(NOTE_IMAGE_TITLE_PREFIX)) {
    return {
      ordinaryTitle: typeof title === "string" ? title : null,
      presentation: normalizeNoteImagePresentation(null),
    };
  }

  const fields = new Map<string, string>();
  for (const part of title.slice(NOTE_IMAGE_TITLE_PREFIX.length).split(";")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    fields.set(part.slice(0, separator), part.slice(separator + 1));
  }

  const encodedTitle = fields.get("t");
  return {
    ordinaryTitle: encodedTitle === undefined ? null : safelyDecodeTitle(encodedTitle),
    presentation: normalizeNoteImagePresentation({
      align: ALIGNMENTS_BY_CODE[fields.get("a") || ""],
      opacity: fields.get("o"),
      widthPercent: fields.get("w"),
    }),
  };
}

/**
 * Serializes image presentation metadata into the Markdown title slot. Default
 * presentation uses the ordinary title directly (or null when there is none),
 * keeping existing Markdown clean and backward compatible.
 */
export function serializeNoteImageTitle(input: SerializedNoteImageTitleInput): string | null {
  const presentation = normalizeNoteImagePresentation(input);
  const ordinaryTitle = typeof input.ordinaryTitle === "string" ? input.ordinaryTitle : null;

  if (isDefaultPresentation(presentation)) return ordinaryTitle;

  const fields = [
    `a=${ALIGNMENT_CODES[presentation.align]}`,
    `o=${formatNumber(presentation.opacity)}`,
  ];
  if (presentation.widthPercent !== null) {
    fields.splice(1, 0, `w=${formatNumber(presentation.widthPercent)}`);
  }
  if (ordinaryTitle !== null) fields.push(`t=${strictEncodeTitle(ordinaryTitle)}`);

  return `${NOTE_IMAGE_TITLE_PREFIX}${fields.join(";")}`;
}

export function serializeNoteImageMarkdown({
  alt,
  src,
  title,
}: {
  alt: unknown;
  src: unknown;
  title: string | null;
}) {
  const source = String(src ?? "");
  const safeAlt = String(alt ?? "").replace(/([\\[\]])/g, "\\$1");
  const destination = /^workspace-image:\/\/[a-zA-Z0-9_-]{8,128}$/.test(source)
    ? source
    : `<${source.replace(/[\u0000-\u0020<>]/gu, (character) =>
        encodeURIComponent(character)
      )}>`;
  const safeTitle = title
    ? ` "${title
        .replace(/\r?\n/g, " ")
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')}"`
    : "";
  return `![${safeAlt}](${destination}${safeTitle})`;
}

function normalizeAlignment(value: unknown): NoteImageAlignment {
  return value === "left" || value === "right" || value === "center"
    ? value
    : DEFAULT_NOTE_IMAGE_PRESENTATION.align;
}

function normalizePercentage(value: unknown, minimum: number): number {
  if (value === null || value === undefined || value === "") return 100;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return 100;
  return Math.min(100, Math.max(minimum, number));
}

function normalizeOptionalPercentage(value: unknown, minimum: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(100, Math.max(minimum, number));
}

function isDefaultPresentation(presentation: NoteImagePresentation): boolean {
  return (
    presentation.align === DEFAULT_NOTE_IMAGE_PRESENTATION.align &&
    presentation.opacity === DEFAULT_NOTE_IMAGE_PRESENTATION.opacity &&
    presentation.widthPercent === null
  );
}

function formatNumber(value: number): string {
  return String(Number(value.toFixed(2)));
}

function strictEncodeTitle(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

function safelyDecodeTitle(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

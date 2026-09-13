import {
  EDITOR_LANGUAGES,
  getEditorLanguageDefinition,
  getProjectBaseName,
  type EditorLanguageKey,
} from "@/lib/editor-project";

export const EDITOR_CODE_TRANSFER_PREFIX = "scripticx:editor-code-transfer:";

const MAX_TRANSFER_CODE_LENGTH = 500_000;

export type EditorCodeTransfer = {
  version: 1;
  code: string;
  language: EditorLanguageKey;
  fileName: string;
  title?: string;
  sourcePath?: string;
  createdAt: number;
};

export function isEditorLanguageKey(value: string | null | undefined): value is EditorLanguageKey {
  return EDITOR_LANGUAGES.some((language) => language.key === value);
}

export function getEditorTransferFileName(
  language: EditorLanguageKey,
  requestedFileName?: string | null,
) {
  const requested = requestedFileName?.trim();
  if (requested) {
    const baseName = getProjectBaseName(requested);
    if (baseName && baseName !== "untitled") return baseName;
  }

  const extension = getEditorLanguageDefinition(language).extensions[0] ?? "txt";
  return `main.${extension}`;
}

export function editorCodeTransferKey(id: string) {
  return `${EDITOR_CODE_TRANSFER_PREFIX}${id}`;
}

export function parseEditorCodeTransfer(raw: string | null): EditorCodeTransfer | null {
  if (!raw) return null;

  try {
    const candidate = JSON.parse(raw) as Partial<EditorCodeTransfer>;
    if (
      candidate.version !== 1 ||
      typeof candidate.code !== "string" ||
      candidate.code.length > MAX_TRANSFER_CODE_LENGTH ||
      !isEditorLanguageKey(candidate.language) ||
      typeof candidate.createdAt !== "number"
    ) {
      return null;
    }

    return {
      version: 1,
      code: candidate.code,
      language: candidate.language,
      fileName: getEditorTransferFileName(candidate.language, candidate.fileName),
      title: typeof candidate.title === "string" ? candidate.title.slice(0, 160) : undefined,
      sourcePath:
        typeof candidate.sourcePath === "string"
          ? candidate.sourcePath.slice(0, 500)
          : undefined,
      createdAt: candidate.createdAt,
    };
  } catch {
    return null;
  }
}


"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  editorCodeTransferKey,
  getEditorTransferFileName,
  type EditorCodeTransfer,
} from "@/lib/editor-code-transfer";
import type { EditorLanguageKey } from "@/lib/editor-project";

type OpenCodeInEditorButtonProps = {
  code: string;
  fileName?: string;
  label: string;
  language: EditorLanguageKey;
  sourceTitle?: string;
};

export function OpenCodeInEditorButton({
  code,
  fileName,
  label,
  language,
  sourceTitle,
}: OpenCodeInEditorButtonProps) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);

  function openEditor() {
    if (opening) return;
    setOpening(true);

    const transferId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const resolvedFileName = getEditorTransferFileName(language, fileName);
    const payload: EditorCodeTransfer = {
      version: 1,
      code,
      language,
      fileName: resolvedFileName,
      title: sourceTitle,
      sourcePath: `${window.location.pathname}${window.location.hash}`,
      createdAt: Date.now(),
    };

    try {
      window.sessionStorage.setItem(
        editorCodeTransferKey(transferId),
        JSON.stringify(payload),
      );
      router.push(`/editor?import=${encodeURIComponent(transferId)}`);
    } catch {
      const params = new URLSearchParams({
        code,
        language,
        file: resolvedFileName,
      });
      if (sourceTitle) params.set("title", sourceTitle);
      router.push(`/editor?${params.toString()}`);
    }
  }

  return (
    <Button
      disabled={opening}
      onClick={openEditor}
      size="sm"
      type="button"
      variant="outline"
    >
      {opening ? `${label}…` : label}
    </Button>
  );
}


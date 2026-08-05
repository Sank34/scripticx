"use client";

import { Clipboard, Copy, Download, Eraser, Play, Send } from "lucide-react";
import { toast } from "sonner";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

type CodeEditorContextMenuProps = {
  children: React.ReactNode;
  code: string;
  disabled?: boolean;
  fileName?: string;
  onChange?: (code: string) => void;
  onRun?: () => void;
  onSubmit?: () => void;
  readOnly?: boolean;
  submitDisabled?: boolean;
  submitShortcut?: string;
};

export function CodeEditorContextMenu({
  children,
  code,
  disabled = false,
  fileName = "main.msp",
  onChange,
  onRun,
  onSubmit,
  readOnly = false,
  submitDisabled = false,
  submitShortcut,
}: CodeEditorContextMenuProps) {
  async function copyCode() {
    await navigator.clipboard.writeText(code);
    toast.success("Code copied");
  }

  async function pasteCode() {
    if (readOnly || !onChange) return;

    const text = await navigator.clipboard.readText();
    if (!text) return;

    onChange(code ? `${code}\n${text}` : text);
    toast.success("Code pasted");
  }

  function clearCode() {
    if (readOnly || !onChange) return;

    onChange("");
    toast.success("Editor cleared");
  }

  function downloadCode() {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("File downloaded");
  }

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuLabel className="truncate">{fileName}</ContextMenuLabel>
        <ContextMenuSeparator />

        <ContextMenuItem onSelect={copyCode}>
          <Copy size={14} />
          Copy code
        </ContextMenuItem>

        <ContextMenuItem disabled={readOnly || !onChange} onSelect={pasteCode}>
          <Clipboard size={14} />
          Paste
        </ContextMenuItem>

        <ContextMenuItem disabled={readOnly || !onChange} onSelect={clearCode}>
          <Eraser size={14} />
          Clear editor
        </ContextMenuItem>

        <ContextMenuSeparator />

        {onRun && (
          <ContextMenuItem onSelect={onRun}>
            <Play size={14} />
            Run
          </ContextMenuItem>
        )}

        {onSubmit && (
          <ContextMenuItem disabled={submitDisabled} onSelect={onSubmit}>
            <Send size={14} />
            Submit
            {submitShortcut && (
              <ContextMenuShortcut>{submitShortcut}</ContextMenuShortcut>
            )}
          </ContextMenuItem>
        )}

        <ContextMenuSub>
          <ContextMenuSubTrigger>More tools</ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-44">
            <ContextMenuItem onSelect={downloadCode}>
              <Download size={14} />
              Download file
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
      </ContextMenuContent>
    </ContextMenu>
  );
}

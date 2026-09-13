"use client";

import { useState } from "react";
import { Columns2, Eye, Maximize2, PencilLine, X } from "lucide-react";

import { Markdown } from "@/components/Markdown";
import { MiniScriptMonacoEditor } from "@/components/editor/MiniScriptMonacoEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type EditorMode = "edit" | "split" | "preview";

type MarkdownStudioProps = {
  codeLocale?: string;
  description: string;
  emptyLabel: string;
  languageLabel: string;
  closeEditorLabel: string;
  openEditorLabel: string;
  onChange: (value: string) => void;
  path: string;
  title: string;
  value: string;
  charactersLabel: string;
};

const modeLabels = {
  edit: "Edit",
  split: "Split",
  preview: "Preview",
};

function ModeControl({ mode, onChange }: { mode: EditorMode; onChange: (mode: EditorMode) => void }) {
  const items = [
    ["edit", PencilLine],
    ["split", Columns2],
    ["preview", Eye],
  ] as const;

  return (
    <div className="inline-flex items-center rounded-[var(--sx-radius-control)] border bg-muted/35 p-0.5">
      {items.map(([value, Icon]) => (
        <Button
          key={value}
          type="button"
          variant={mode === value ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => onChange(value)}
          aria-pressed={mode === value}
          aria-label={modeLabels[value]}
        >
          <Icon className="size-3.5" />
          <span className="hidden sm:inline">{modeLabels[value]}</span>
        </Button>
      ))}
    </div>
  );
}

export function MarkdownStudio({
  codeLocale = "en",
  description,
  emptyLabel,
  languageLabel,
  closeEditorLabel,
  openEditorLabel,
  onChange,
  path,
  title,
  value,
  charactersLabel,
}: MarkdownStudioProps) {
  const [mode, setMode] = useState<EditorMode>("split");
  const [studioMode, setStudioMode] = useState<EditorMode>("split");
  const [studioOpen, setStudioOpen] = useState(false);

  function surface(currentMode: EditorMode, fullScreen = false) {
    const editor = currentMode !== "preview" && (
      <div className="h-full min-h-0 overflow-hidden bg-zinc-950">
        <MiniScriptMonacoEditor
          value={value}
          onChange={onChange}
          language="markdown"
          path={path}
          theme="dark"
          height="100%"
          options={{
            automaticLayout: true,
            folding: true,
            glyphMargin: false,
            lineDecorationsWidth: 10,
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            minimap: { enabled: false },
            padding: fullScreen ? { top: 28, bottom: 32 } : { top: 18, bottom: 22 },
            quickSuggestions: false,
            renderWhitespace: "selection",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            wrappingIndent: "same",
          }}
        />
      </div>
    );
    const preview = currentMode !== "edit" && (
      <div className="note-scrollbar h-full min-h-0 overflow-y-auto bg-background">
        <article className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10 lg:py-14">
          {value.trim() ? (
            <Markdown highlightCode codeLocale={codeLocale} className="text-[15px] leading-7 sm:text-base sm:leading-8">
              {value}
            </Markdown>
          ) : (
            <div className="grid min-h-56 place-items-center border border-dashed px-6 text-center text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          )}
        </article>
      </div>
    );

    if (currentMode === "split") {
      return (
        <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-2">
          <div className="min-h-0 border-b md:border-r md:border-b-0">{editor}</div>
          <div className="min-h-0">{preview}</div>
        </div>
      );
    }
    return <div className="h-full min-h-0">{editor || preview}</div>;
  }

  return (
    <TooltipProvider delayDuration={180}>
      <section className="sx-surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <PencilLine className="size-4 text-muted-foreground" />
              <h3 className="font-semibold">{title}</h3>
              <Badge variant="secondary">{languageLabel}</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            <ModeControl mode={mode} onChange={setMode} />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => {
                    setStudioMode("split");
                    setStudioOpen(true);
                  }}
                  aria-label={openEditorLabel}
                >
                  <Maximize2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{openEditorLabel}</TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="h-[430px] min-h-0">{surface(mode)}</div>
        <div className="flex items-center justify-between border-t bg-muted/35 px-4 py-2 text-xs text-muted-foreground">
          <span>{value.length} {charactersLabel}</span>
          <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => setStudioOpen(true)}>
            <Maximize2 className="size-3.5" />
            {openEditorLabel}
          </Button>
        </div>
      </section>

      <Dialog open={studioOpen} onOpenChange={setStudioOpen}>
        <DialogContent
          showCloseButton={false}
          className="inset-0 top-0 left-0 z-[160] flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 ring-0 sm:h-dvh sm:w-screen sm:max-w-none"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <Button type="button" variant="outline" size="icon-sm" onClick={() => setStudioOpen(false)} aria-label={closeEditorLabel}>
                <X />
              </Button>
              <p className="truncate text-sm font-semibold">{title}</p>
              <Badge variant="secondary" className="hidden sm:inline-flex">{languageLabel}</Badge>
            </div>
            <ModeControl mode={studioMode} onChange={setStudioMode} />
          </header>
          <main className="min-h-0 flex-1 overflow-hidden">{surface(studioMode, true)}</main>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

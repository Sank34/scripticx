"use client";

import { CircleAlert, LoaderCircle, Monitor, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmailPreviewMode = "desktop" | "mobile";
export type EmailContentMode = "html" | "plain";

export function EmailPreview({
  className,
  contentMode,
  device,
  emptyLabel,
  errorMessage,
  html,
  isLoading,
  labels,
  onDeviceChange,
  text,
}: {
  className?: string;
  contentMode: EmailContentMode;
  device: EmailPreviewMode;
  emptyLabel: string;
  errorMessage?: string | null;
  html: string | null;
  isLoading?: boolean;
  labels: { desktop: string; mobile: string; preview: string };
  onDeviceChange: (mode: EmailPreviewMode) => void;
  text: string;
}) {
  const hasPreview = contentMode === "html" ? Boolean(html) : Boolean(text.trim());

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden bg-muted/25", className)}>
      <div className="flex h-12 shrink-0 items-center justify-between border-b bg-background px-3">
        <div className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
          <span>{labels.preview}</span>
          {isLoading && <LoaderCircle className="size-3 shrink-0 animate-spin" />}
          {errorMessage && (
            <span
              className="flex min-w-0 items-center gap-1 text-destructive"
              title={errorMessage}
              role="status"
            >
              <CircleAlert className="size-3 shrink-0" />
              <span className="hidden max-w-72 truncate lg:inline">{errorMessage}</span>
            </span>
          )}
        </div>
        <div className="flex items-center rounded-lg border bg-muted/40 p-0.5">
          <Button
            type="button"
            size="icon-sm"
            variant={device === "desktop" ? "secondary" : "ghost"}
            aria-label={labels.desktop}
            onClick={() => onDeviceChange("desktop")}
          >
            <Monitor className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant={device === "mobile" ? "secondary" : "ghost"}
            aria-label={labels.mobile}
            onClick={() => onDeviceChange("mobile")}
          >
            <Smartphone className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="relative min-h-[32rem] flex-1 overflow-auto p-3 sm:p-5">
        {!hasPreview ? (
          <div className="grid h-full min-h-[28rem] place-items-center rounded-xl border border-dashed bg-background/70 p-8 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        ) : contentMode === "html" && html ? (
          <iframe
            title="Email preview"
            sandbox=""
            srcDoc={html}
            className={cn(
              "mx-auto block h-[42rem] w-full border-0 bg-white shadow-sm transition-[max-width,border-radius] duration-300",
              device === "mobile"
                ? "max-w-[390px] rounded-[1.75rem] ring-8 ring-zinc-900"
                : "max-w-[760px] rounded-xl ring-1 ring-border"
            )}
          />
        ) : (
          <div
            className={cn(
              "mx-auto min-h-[34rem] whitespace-pre-wrap rounded-xl border bg-background p-6 font-mono text-sm leading-7 shadow-sm transition-[max-width] duration-300",
              device === "mobile" ? "max-w-[390px]" : "max-w-[680px]"
            )}
          >
            {text}
          </div>
        )}
      </div>
    </div>
  );
}

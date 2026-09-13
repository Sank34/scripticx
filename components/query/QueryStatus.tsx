"use client";

import { CloudOff, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BackgroundQueryStatusProps = {
  cachedLabel: string;
  className?: string;
  isError: boolean;
  isFetching: boolean;
  onRetry: () => void;
  refreshingLabel: string;
  retryLabel: string;
};

export function BackgroundQueryStatus({
  cachedLabel,
  className,
  isError,
  isFetching,
  onRetry,
  refreshingLabel,
  retryLabel,
}: BackgroundQueryStatusProps) {
  if (!isFetching && !isError) return null;

  if (isFetching) {
    return (
      <span
        role="status"
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-background/80 px-2.5 text-xs text-muted-foreground shadow-sm backdrop-blur",
          className
        )}
      >
        <Loader2 className="size-3 animate-spin" />
        {refreshingLabel}
      </span>
    );
  }

  return (
    <span
      role="status"
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 pl-2.5 pr-1 text-xs text-amber-700 dark:text-amber-300",
        className
      )}
    >
      <CloudOff className="size-3" />
      {cachedLabel}
      <button
        type="button"
        onClick={onRetry}
        aria-label={retryLabel}
        title={retryLabel}
        className="inline-flex size-5 items-center justify-center rounded-full transition-colors hover:bg-amber-500/15"
      >
        <RefreshCw className="size-3" />
      </button>
    </span>
  );
}

type QuerySectionErrorProps = {
  className?: string;
  description: string;
  onRetry: () => void;
  retryLabel: string;
  title: string;
};

export function QuerySectionError({
  className,
  description,
  onRetry,
  retryLabel,
  title,
}: QuerySectionErrorProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center",
        className
      )}
    >
      <CloudOff className="mx-auto size-5 text-muted-foreground" />
      <p className="mt-3 text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry} className="mt-4">
        <RefreshCw className="size-4" />
        {retryLabel}
      </Button>
    </div>
  );
}

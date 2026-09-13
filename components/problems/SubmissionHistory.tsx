"use client";

import { CheckCircle2, Clock3, Code2 } from "lucide-react";
import { useMemo, useState } from "react";

import { HighlightedCodeBlock } from "@/components/code/HighlightedCodeBlock";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type SubmissionHistoryItem = {
  id: string;
  code: string;
  score: number;
  submittedAt: string;
  points?: number;
  maximumPoints?: number;
  label?: string;
};

type SubmissionHistoryProps = {
  emptyDescription?: string;
  items: SubmissionHistoryItem[];
  locale?: string;
};

export function SubmissionHistory({
  emptyDescription = "Nu ai trimis încă nicio soluție.",
  items,
  locale = "ro",
}: SubmissionHistoryProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId]
  );

  if (!items.length) {
    return (
      <div className="sx-surface border-dashed px-5 py-10 text-center">
        <Code2 className="mx-auto size-7 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {items.map((item) => {
          const perfect = item.score === 100;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className="sx-interactive flex w-full items-center justify-between gap-4 rounded-[var(--sx-radius-card)] border bg-card px-4 py-3 text-left text-card-foreground outline-none hover:border-foreground/20 hover:bg-muted/45 focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-[var(--sx-radius-control)]",
                      perfect
                        ? "bg-[var(--sx-success-soft)] text-[var(--sx-success)]"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {perfect ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <Code2 className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {item.label || `Submission ${item.id.slice(0, 8)}`}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="size-3" />
                      {new Date(item.submittedAt).toLocaleString(
                        locale === "ro" ? "ro-RO" : "en-US"
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {typeof item.points === "number" && (
                  <Badge variant="secondary">
                    {item.points}
                    {typeof item.maximumPoints === "number"
                      ? `/${item.maximumPoints}`
                      : ""}{" "}
                    pct
                  </Badge>
                )}
                <Badge variant={perfect ? "default" : "outline"}>{item.score}%</Badge>
              </div>
            </button>
          );
        })}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selected?.label || "Cod trimis"}</DialogTitle>
            <DialogDescription>
              {selected
                ? `${new Date(selected.submittedAt).toLocaleString(
                    locale === "ro" ? "ro-RO" : "en-US"
                  )} · ${selected.score}%`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <HighlightedCodeBlock
              code={selected.code}
              copyLabel={locale === "ro" ? "Copiază" : "Copy"}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

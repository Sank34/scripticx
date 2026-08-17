"use client";

import { Check, ListTree } from "lucide-react";
import { useId, useMemo } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NoteOutlineItem } from "@/lib/note-outline";
import { compactNoteOverviewItems } from "@/lib/note-overview";
import { cn } from "@/lib/utils";

export type NoteOverviewRailProps = {
  activeId: string | null;
  className?: string;
  items: readonly NoteOutlineItem[];
  onNavigate: (item: NoteOutlineItem) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  ro: boolean;
};

export function NoteOverviewRail({
  activeId,
  className,
  items,
  onNavigate,
  onOpenChange,
  open,
  ro,
}: NoteOverviewRailProps) {
  const contentId = useId();
  const titleId = useId();
  const compactItems = useMemo(
    () => compactNoteOverviewItems(items, activeId),
    [activeId, items]
  );
  const placeholderTicks = compactItems.length ? compactItems : Array.from({ length: 5 }, () => null);
  const completedTasks = items.filter(
    (item) => item.kind === "task" && item.checked
  ).length;
  const taskCount = items.filter((item) => item.kind === "task").length;
  const listHeight = Math.min(352, Math.max(items.length ? items.length * 37 + 12 : 104, 104));

  return (
    <Popover onOpenChange={onOpenChange} open={open}>
      <PopoverTrigger asChild>
        <button
          aria-controls={contentId}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={ro ? "Deschide cuprinsul notiței" : "Open note overview"}
          className={cn(
            "group absolute right-0 top-1/2 z-20 flex min-h-11 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-border outline-none transition-colors hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:right-1",
            className
          )}
          title={ro ? "Cuprins" : "Overview"}
          type="button"
        >
          <span
            aria-hidden="true"
            className="flex min-w-6 flex-col items-end gap-[5px] rounded-md px-1.5 py-2.5 transition-colors group-hover:bg-muted/45"
          >
            {placeholderTicks.map((item, index) => {
              const active = item?.id === activeId;
              const width = active
                ? 16
                : item
                  ? Math.max(7, 13 - (Math.min(item.depth, 3) - 1) * 2)
                  : Math.max(7, 13 - (index % 3) * 2);
              return (
                <span
                  className={cn(
                    "block rounded-full bg-current transition-[width,background-color,opacity] duration-150",
                    active ? "h-0.5 text-foreground" : "h-px opacity-80"
                  )}
                  key={item?.id ?? `placeholder-${index}`}
                  style={{ width }}
                />
              );
            })}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        aria-labelledby={titleId}
        className="w-[min(17rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0"
        collisionPadding={12}
        id={contentId}
        role="dialog"
        side="left"
        sideOffset={8}
      >
        <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2.5">
          <ListTree aria-hidden="true" className="size-4 text-muted-foreground" />
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold" id={titleId}>
            {ro ? "Cuprins" : "Overview"}
          </h2>
          {taskCount ? (
            <span
              aria-label={
                ro
                  ? `${completedTasks} din ${taskCount} checkpoints finalizate`
                  : `${completedTasks} of ${taskCount} checkpoints completed`
              }
              className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground"
            >
              {completedTasks}/{taskCount}
            </span>
          ) : null}
        </div>

        <ScrollArea
          className="note-scrollbar [&_[data-slot=scroll-area-scrollbar]]:w-2 [&_[data-slot=scroll-area-thumb]]:bg-muted-foreground/30"
          style={{ height: `min(${listHeight}px, calc(100vh - 8rem))` }}
        >
          {items.length ? (
            <ol className="p-1.5">
              {items.map((item) => {
                const active = item.id === activeId;
                return (
                  <li key={item.id}>
                    <button
                      aria-current={active ? "location" : undefined}
                      className={cn(
                        "group flex w-full items-center gap-2 rounded-md py-2 pr-2 text-left text-xs text-muted-foreground outline-none transition-colors hover:bg-accent/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/60",
                        active && "bg-accent text-foreground"
                      )}
                      onClick={() => {
                        onNavigate(item);
                        onOpenChange(false);
                      }}
                      style={{ paddingLeft: 8 + (Math.min(item.depth, 3) - 1) * 12 }}
                      title={`${item.text} · ${ro ? "linia" : "line"} ${item.line}`}
                      type="button"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-3.5 shrink-0 items-center justify-center rounded-full border border-border bg-background transition-colors",
                          item.kind === "heading" && "border-transparent",
                          item.checked && "border-primary bg-primary text-primary-foreground"
                        )}
                      >
                        {item.kind === "task" && item.checked ? (
                          <Check className="size-2.5" />
                        ) : item.kind === "heading" ? (
                          <span className="size-1.5 rounded-full bg-current" />
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate",
                          item.kind === "heading" && "font-medium text-foreground/90",
                          item.checked && "line-through opacity-65"
                        )}
                      >
                        {item.text}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="flex h-full min-h-24 items-center justify-center px-5 text-center text-xs leading-5 text-muted-foreground">
              {ro
                ? "Adaugă titluri sau checklist-uri pentru a construi cuprinsul."
                : "Add headings or checklists to build your overview."}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

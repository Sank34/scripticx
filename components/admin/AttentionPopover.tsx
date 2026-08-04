"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  Check,
  Circle,
  CircleCheck,
  ExternalLink,
  EyeOff,
  FileText,
  ListChecks,
  ListTodo,
  Mail,
  Megaphone,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { AttentionTaskForm } from "@/components/admin/AttentionTaskForm";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

import {
  buildAttentionBoard,
  isExternalTaskLink,
  type AdminTask,
  type AttentionEntry,
} from "@/lib/adminTasks";
import {
  deleteAdminTask,
  dismissAttentionItem,
  fetchAdminTaskBoard,
  restoreAttentionItem,
  setAdminTaskDone,
} from "@/lib/adminTasksData";
import { buildAttentionItems, type AttentionItemId } from "@/lib/adminOverview";
import { fetchAdminCounts, fetchAdminOverview } from "@/lib/adminOverviewData";
import { cn } from "@/lib/utils";

const ATTENTION_ICON: Record<AttentionItemId, typeof Mail> = {
  bannedUsers: Users,
  noDailyToday: CalendarDays,
  noDailyUpcoming: CalendarDays,
  noProblems: FileText,
  staleChangelog: Megaphone,
  unresolvedMessages: Mail,
};

const STALE_TIME = 60_000;

type RowProps = {
  busy: boolean;
  entry: AttentionEntry;
  onDelete: (task: AdminTask) => void;
  onDismiss: (id: AttentionItemId) => void;
  onEdit: (task: AdminTask) => void;
  onNavigate: () => void;
  onRestore: (id: AttentionItemId) => void;
  onToggleDone: (task: AdminTask) => void;
};

function AttentionEntryRow({
  busy,
  entry,
  onDelete,
  onDismiss,
  onEdit,
  onNavigate,
  onRestore,
  onToggleDone,
}: RowProps) {
  const { t } = useLanguage();
  const isTask = entry.source === "task";
  const task = entry.task;

  const base = entry.derived
    ? `admin.overview.attention.items.${entry.derived.id}`
    : null;

  const title = entry.derived
    ? t(`${base}.title`).replace("{count}", String(entry.derived.count ?? ""))
    : (task?.title ?? "");

  const description = entry.derived ? t(`${base}.description`) : task?.description;

  const Icon = entry.derived ? ATTENTION_ICON[entry.derived.id] : null;
  const external = entry.href ? isExternalTaskLink(entry.href) : false;

  const content = (
    <div className="min-w-0 flex-1">
      <p
        className={cn(
          "flex items-center gap-1.5 text-sm font-medium",
          entry.done && "text-muted-foreground line-through"
        )}
      >
        <span className="truncate">{title}</span>
        {external && (
          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
      </p>
      {description && (
        <p className="line-clamp-2 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );

  return (
    <div className="group flex items-start gap-3 px-4 py-3">
      {isTask && task ? (
        <button
          aria-label={t(
            entry.done
              ? "admin.overview.attention.tasks.actions.markUndone"
              : "admin.overview.attention.tasks.actions.markDone"
          )}
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition hover:opacity-80 disabled:opacity-50"
          disabled={busy}
          onClick={() => onToggleDone(task)}
          type="button"
        >
          {entry.done ? (
            <CircleCheck className="h-5 w-5 text-emerald-500" />
          ) : (
            <Circle
              className={cn(
                "h-5 w-5",
                entry.severity === "warn" ? "text-amber-500" : "text-blue-500"
              )}
            />
          )}
        </button>
      ) : (
        Icon && (
          <span
            className={cn(
              "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
              entry.done
                ? "bg-muted text-muted-foreground"
                : entry.severity === "warn"
                  ? "bg-amber-100 text-amber-700"
                  : "bg-blue-100 text-blue-700"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        )
      )}

      {entry.href ? (
        <Link
          className="flex min-w-0 flex-1 transition hover:opacity-80"
          href={entry.href}
          onClick={onNavigate}
          rel={external ? "noreferrer" : undefined}
          target={external ? "_blank" : undefined}
        >
          {content}
        </Link>
      ) : (
        content
      )}

      <div className="flex shrink-0 items-center gap-0.5">
        {isTask && task ? (
          <>
            <Button
              aria-label={t("admin.overview.attention.tasks.actions.edit")}
              className="h-7 w-7 text-muted-foreground"
              disabled={busy}
              onClick={() => onEdit(task)}
              size="icon"
              variant="ghost"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              aria-label={t("admin.overview.attention.tasks.actions.delete")}
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={busy}
              onClick={() => onDelete(task)}
              size="icon"
              variant="ghost"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : entry.derived ? (
          <Button
            aria-label={t(
              entry.done
                ? "admin.overview.attention.tasks.actions.restore"
                : "admin.overview.attention.tasks.actions.dismiss"
            )}
            className="h-7 w-7 text-muted-foreground"
            disabled={busy}
            onClick={() =>
              entry.done
                ? onRestore(entry.derived!.id)
                : onDismiss(entry.derived!.id)
            }
            size="icon"
            variant="ghost"
          >
            {entry.done ? (
              <RotateCcw className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function AttentionPopover({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTask | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<AdminTask | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const countsQuery = useQuery({
    queryKey: ["admin", "counts"],
    queryFn: fetchAdminCounts,
    enabled: isAdmin,
    staleTime: STALE_TIME,
  });

  const overviewQuery = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: fetchAdminOverview,
    enabled: isAdmin,
    staleTime: STALE_TIME,
  });

  const boardQuery = useQuery({
    queryKey: ["admin", "tasks"],
    queryFn: fetchAdminTaskBoard,
    enabled: isAdmin,
    staleTime: STALE_TIME,
  });

  const derived = useMemo(
    () => buildAttentionItems(countsQuery.data, overviewQuery.data, new Date()),
    [countsQuery.data, overviewQuery.data]
  );

  const board = useMemo(
    () => buildAttentionBoard(derived, boardQuery.data),
    [derived, boardQuery.data]
  );

  const isLoading =
    countsQuery.isPending || overviewQuery.isPending || boardQuery.isPending;
  const openCount = board.open.length;

  function refreshTasks() {
    return queryClient.invalidateQueries({ queryKey: ["admin", "tasks"] });
  }

  async function run(key: string, action: () => Promise<void>, success: string) {
    setBusyKey(key);

    try {
      await action();
      await refreshTasks();
      toast.success(t(success));
    } catch {
      toast.error(t("admin.overview.attention.tasks.toast.actionError"));
    } finally {
      setBusyKey(null);
    }
  }

  function handleToggleDone(task: AdminTask) {
    void run(
      `task-${task.id}`,
      () => setAdminTaskDone(task.id, !task.done),
      task.done
        ? "admin.overview.attention.tasks.toast.reopened"
        : "admin.overview.attention.tasks.toast.completed"
    );
  }

  function handleDelete() {
    const task = pendingDelete;
    if (!task) return;

    setPendingDelete(null);
    void run(
      `task-${task.id}`,
      () => deleteAdminTask(task.id),
      "admin.overview.attention.tasks.toast.deleted"
    );
  }

  function handleDismiss(id: AttentionItemId) {
    const item = derived.find((entry) => entry.id === id);
    if (!item) return;

    void run(
      `derived-${id}`,
      () => dismissAttentionItem(item),
      "admin.overview.attention.tasks.toast.dismissed"
    );
  }

  function handleRestore(id: AttentionItemId) {
    void run(
      `derived-${id}`,
      () => restoreAttentionItem(id),
      "admin.overview.attention.tasks.toast.restored"
    );
  }

  function openCreate() {
    setOpen(false);
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(task: AdminTask) {
    setOpen(false);
    setEditing(task);
    setFormOpen(true);
  }

  const rowProps = {
    onDelete: setPendingDelete,
    onDismiss: handleDismiss,
    onEdit: openEdit,
    onNavigate: () => setOpen(false),
    onRestore: handleRestore,
    onToggleDone: handleToggleDone,
  };

  if (!isAdmin) return null;

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-zinc-600 transition hover:border-zinc-200 hover:bg-zinc-100 hover:text-zinc-950"
            aria-label={t("admin.overview.attention.title")}
          >
            {openCount ? <ListTodo size={18} /> : <ListChecks size={18} />}

            {openCount ? (
              <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {openCount > 99 ? "99+" : openCount}
              </span>
            ) : null}
          </button>
        </PopoverTrigger>

        <PopoverContent
          align={isMobile ? "center" : "end"}
          sideOffset={12}
          collisionPadding={isMobile ? 20 : 8}
          className="w-[calc(100vw-3rem)] max-w-[23rem] gap-0 overflow-hidden rounded-2xl p-0 sm:w-96 sm:max-w-none"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div>
              <h2 className="text-base font-semibold">
                {t("admin.overview.attention.title")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {openCount
                  ? t("admin.overview.attention.pending").replace(
                      "{count}",
                      String(openCount)
                    )
                  : t("admin.overview.attention.empty.title")}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={openCreate}
              className="h-8 gap-1 rounded-xl px-2 text-xs"
            >
              <Plus size={14} />
              {t("admin.overview.attention.tasks.add")}
            </Button>
          </div>

          <ScrollArea className="h-[min(28rem,calc(100vh-12rem))]">
            {isLoading ? (
              <div className="space-y-3 p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="h-7 w-7 rounded-full bg-zinc-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-zinc-100" />
                      <div className="h-3 w-1/2 rounded bg-zinc-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : openCount ? (
              <div className="divide-y">
                {board.open.map((entry) => (
                  <AttentionEntryRow
                    busy={busyKey === entry.key}
                    entry={entry}
                    key={entry.key}
                    {...rowProps}
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center px-6 text-center">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
                  <CircleCheck size={18} className="text-emerald-500" />
                </div>
                <p className="text-sm font-medium">
                  {t("admin.overview.attention.empty.title")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("admin.overview.attention.empty.description")}
                </p>
              </div>
            )}

            {board.archived.length > 0 && (
              <div className="border-t">
                <button
                  className="flex w-full items-center gap-1.5 px-4 py-3 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                  onClick={() => setShowArchived((value) => !value)}
                  type="button"
                >
                  <Check className="h-3.5 w-3.5" />
                  {t(
                    showArchived
                      ? "admin.overview.attention.tasks.actions.hideCompleted"
                      : "admin.overview.attention.tasks.actions.showCompleted"
                  ).replace("{count}", String(board.archived.length))}
                </button>

                {showArchived && (
                  <div className="divide-y border-t">
                    {board.archived.map((entry) => (
                      <AttentionEntryRow
                        busy={busyKey === entry.key}
                        entry={entry}
                        key={entry.key}
                        {...rowProps}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <Dialog onOpenChange={setFormOpen} open={formOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {t(
                editing
                  ? "admin.overview.attention.tasks.editTitle"
                  : "admin.overview.attention.tasks.createTitle"
              )}
            </DialogTitle>
          </DialogHeader>

          <AttentionTaskForm
            initialData={editing}
            key={editing?.id ?? "new"}
            onCancel={() => setFormOpen(false)}
            onSuccess={() => {
              setFormOpen(false);
              void refreshTasks();
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        onOpenChange={(value) => !value && setPendingDelete(null)}
        open={!!pendingDelete}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.overview.attention.tasks.delete.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.overview.attention.tasks.delete.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("admin.overview.attention.tasks.delete.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("admin.overview.attention.tasks.delete.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

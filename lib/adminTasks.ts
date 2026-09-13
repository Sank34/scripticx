import type {
  AttentionItem,
  AttentionItemId,
  AttentionSeverity,
} from "@/lib/adminOverview";

export type AdminTask = {
  completed_at: string | null;
  created_at: string;
  description: string | null;
  done: boolean;
  id: string;
  link: string | null;
  severity: AttentionSeverity;
  title: string;
};

export type AdminTaskInput = {
  description: string | null;
  link: string | null;
  severity: AttentionSeverity;
  title: string;
};

export type AttentionDismissal = {
  item_id: string;
  signature: string;
};

export type AdminTaskBoard = {
  dismissals: AttentionDismissal[];
  tasks: AdminTask[];
};

export type AttentionEntry = {
  derived?: { count?: number; id: AttentionItemId };
  done: boolean;
  href: string | null;
  key: string;
  severity: AttentionSeverity;
  source: "derived" | "task";
  task?: AdminTask;
};

export type AttentionBoard = {
  archived: AttentionEntry[];
  open: AttentionEntry[];
};

export function attentionSignature(item: AttentionItem): string {
  return `${item.id}:${item.count ?? "-"}`;
}

export function normalizeTaskLink(raw: string | null | undefined): string | null {
  const link = raw?.trim();
  return link ? link : null;
}

export function isValidTaskLink(raw: string | null | undefined): boolean {
  const link = normalizeTaskLink(raw);
  if (link === null) return true;
  if (link.startsWith("/")) return !link.startsWith("//");

  try {
    const { protocol } = new URL(link);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export function isExternalTaskLink(link: string): boolean {
  return !link.startsWith("/");
}

function severityRank(severity: AttentionSeverity): number {
  return severity === "warn" ? 0 : 1;
}

function taskEntry(task: AdminTask): AttentionEntry {
  return {
    done: task.done,
    href: task.link,
    key: `task-${task.id}`,
    severity: task.severity,
    source: "task",
    task,
  };
}

function time(value: string | null): number {
  const parsed = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildAttentionBoard(
  derived: AttentionItem[],
  board: AdminTaskBoard | undefined
): AttentionBoard {
  const tasks = board?.tasks ?? [];
  const dismissed = new Map(
    (board?.dismissals ?? []).map((entry) => [entry.item_id, entry.signature])
  );

  const openTasks = tasks.filter((task) => !task.done).map(taskEntry);
  const openDerived: AttentionEntry[] = [];
  const dismissedDerived: AttentionEntry[] = [];

  for (const item of derived) {
    const entry: AttentionEntry = {
      derived: { count: item.count, id: item.id },
      done: dismissed.get(item.id) === attentionSignature(item),
      href: item.href,
      key: `derived-${item.id}`,
      severity: item.severity,
      source: "derived",
    };

    (entry.done ? dismissedDerived : openDerived).push(entry);
  }

  const open = [...openTasks, ...openDerived].sort((a, b) => {
    const severity = severityRank(a.severity) - severityRank(b.severity);
    if (severity !== 0) return severity;

    if (a.source !== b.source) return a.source === "task" ? -1 : 1;
    if (a.source === "derived") return 0;

    return time(b.task?.created_at ?? null) - time(a.task?.created_at ?? null);
  });

  const archived = [
    ...tasks.filter((task) => task.done).map(taskEntry),
    ...dismissedDerived,
  ].sort((a, b) => {
    const completed =
      time(b.task?.completed_at ?? null) - time(a.task?.completed_at ?? null);
    if (completed !== 0) return completed;

    return a.source === b.source ? 0 : a.source === "task" ? -1 : 1;
  });

  return { archived, open };
}

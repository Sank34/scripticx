export const WORKSHOP_SECTION_KINDS = [
  "talk",
  "demo",
  "activity",
  "game",
  "break",
  "qa",
] as const;

export const WORKSHOP_RESOURCE_KINDS = [
  "canva",
  "slides",
  "game",
  "doc",
  "video",
  "link",
] as const;

export const WORKSHOP_STATUSES = ["draft", "scheduled", "delivered"] as const;

export type WorkshopSectionKind = (typeof WORKSHOP_SECTION_KINDS)[number];
export type WorkshopResourceKind = (typeof WORKSHOP_RESOURCE_KINDS)[number];
export type WorkshopStatus = (typeof WORKSHOP_STATUSES)[number];

export type WorkshopResource = {
  id: string;
  kind: WorkshopResourceKind;
  title: string;
  url: string;
  note: string;
};

export type WorkshopSection = {
  id: string;
  title: string;
  kind: WorkshopSectionKind;
  durationMinutes: number;
  owner: string;
  notes: string;
  resourceIds: string[];
  done: boolean;
};

export type WorkshopComment = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  resolved: boolean;
};

export type Workshop = {
  id: string;
  title: string;
  summary: string;
  status: WorkshopStatus;
  startsAt: string;
  location: string;
  audience: string;
  trainers: string[];
  sections: WorkshopSection[];
  resources: WorkshopResource[];
  comments: WorkshopComment[];
  createdAt: string;
  updatedAt: string;
};

export type WorkshopDraft = {
  title: string;
  summary: string;
  startsAt: string;
  location: string;
  audience: string;
  trainers: string;
};

const MINIMUM_DURATION = 5;
const MAXIMUM_DURATION = 480;

export function clampDuration(value: unknown) {
  const minutes = Math.round(Number(value));
  if (!Number.isFinite(minutes)) return 15;
  return Math.min(MAXIMUM_DURATION, Math.max(MINIMUM_DURATION, minutes));
}

const CANVA_DESIGN = /^https:\/\/(?:www\.)?canva\.com\/design\/([\w-]+)\/([\w-]+)\/(?:view|edit|watch|present)/i;

export function toCanvaEmbedUrl(url: string): string | null {
  const match = url.trim().match(CANVA_DESIGN);
  if (!match) return null;
  return `https://www.canva.com/design/${match[1]}/${match[2]}/view?embed`;
}

export function isSafeResourceUrl(url: string) {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function resourceHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export type AgendaEntry = {
  section: WorkshopSection;
  index: number;
  offsetMinutes: number;
  startsAt: Date;
  endsAt: Date;
};

export function buildAgenda(workshop: Workshop): AgendaEntry[] {
  const start = new Date(workshop.startsAt).getTime();
  const base = Number.isNaN(start) ? Date.now() : start;

  let offsetMinutes = 0;
  return workshop.sections.map((section, index) => {
    const entry: AgendaEntry = {
      section,
      index,
      offsetMinutes,
      startsAt: new Date(base + offsetMinutes * 60_000),
      endsAt: new Date(base + (offsetMinutes + section.durationMinutes) * 60_000),
    };
    offsetMinutes += section.durationMinutes;
    return entry;
  });
}

export type WorkshopSummary = {
  totalMinutes: number;
  completedSections: number;
  totalSections: number;
  progress: number;
  endsAt: Date;
  resourceCount: number;
  gameCount: number;
  openComments: number;
};

export function summarizeWorkshop(workshop: Workshop): WorkshopSummary {
  const totalMinutes = workshop.sections.reduce(
    (total, section) => total + section.durationMinutes,
    0
  );
  const completedSections = workshop.sections.filter((section) => section.done).length;
  const start = new Date(workshop.startsAt).getTime();

  return {
    totalMinutes,
    completedSections,
    totalSections: workshop.sections.length,
    progress: workshop.sections.length
      ? Math.round((completedSections / workshop.sections.length) * 100)
      : 0,
    endsAt: new Date((Number.isNaN(start) ? Date.now() : start) + totalMinutes * 60_000),
    resourceCount: workshop.resources.length,
    gameCount: workshop.resources.filter((resource) => resource.kind === "game").length,
    openComments: workshop.comments.filter((comment) => !comment.resolved).length,
  };
}

export function currentAgendaEntry(
  workshop: Workshop,
  now: Date = new Date()
): AgendaEntry | null {
  const time = now.getTime();
  return (
    buildAgenda(workshop).find(
      (entry) => time >= entry.startsAt.getTime() && time < entry.endsAt.getTime()
    ) ?? null
  );
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  if (!rest) return `${hours} h`;
  return `${hours} h ${rest} min`;
}

export function formatClock(date: Date, locale: "en" | "ro") {
  return date.toLocaleTimeString(locale === "ro" ? "ro-RO" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function agendaToPlainText(workshop: Workshop, locale: "en" | "ro") {
  const lines = [workshop.title, ""];

  for (const entry of buildAgenda(workshop)) {
    lines.push(
      `${formatClock(entry.startsAt, locale)}–${formatClock(entry.endsAt, locale)}  ${
        entry.section.title
      } (${entry.section.durationMinutes} min)`
    );

    for (const resourceId of entry.section.resourceIds) {
      const resource = workshop.resources.find((item) => item.id === resourceId);
      if (resource) lines.push(`    ${resource.title} — ${resource.url}`);
    }
  }

  return lines.join("\n");
}

export function parseTrainers(value: string) {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export type CompetitionPhase =
  | "draft"
  | "upcoming"
  | "live"
  | "break"
  | "finished"
  | "cancelled";

export type CompetitionBreakWindow = {
  starts_at: string;
  ends_at: string;
};

export type CompetitionTiming = {
  starts_at: string;
  ends_at: string;
  status: "draft" | "published" | "cancelled" | string;
};

export function isValidCompetitionWindow(startsAt: string, endsAt: string) {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  return Number.isFinite(start) && Number.isFinite(end) && end > start;
}

export function isCompetitionBreak(
  breaks: CompetitionBreakWindow[],
  now = new Date()
) {
  const timestamp = now.getTime();
  return breaks.some((item) => {
    const start = Date.parse(item.starts_at);
    const end = Date.parse(item.ends_at);
    return Number.isFinite(start) && Number.isFinite(end) && timestamp >= start && timestamp < end;
  });
}

export function getCompetitionPhase(
  competition: CompetitionTiming,
  breaks: CompetitionBreakWindow[] = [],
  now = new Date()
): CompetitionPhase {
  if (competition.status === "cancelled") return "cancelled";
  if (competition.status !== "published") return "draft";

  const timestamp = now.getTime();
  const startsAt = Date.parse(competition.starts_at);
  const endsAt = Date.parse(competition.ends_at);

  if (timestamp < startsAt) return "upcoming";
  if (timestamp >= endsAt) return "finished";
  if (isCompetitionBreak(breaks, now)) return "break";
  return "live";
}

export function calculateCompetitionPoints(score: number, maximum: number) {
  const safeScore = Math.min(100, Math.max(0, Number(score) || 0));
  const safeMaximum = Math.max(0, Math.round(Number(maximum) || 0));
  return Math.round((safeScore / 100) * safeMaximum);
}

export function calculateCompetitionMaximum(
  problems: Array<{ max_points?: number | null }>
) {
  return problems.reduce(
    (total, problem) => total + Math.max(0, Number(problem.max_points) || 0),
    0
  );
}

export function slugifyCompetitionName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

export function getRemainingMilliseconds(endsAt: string, now = new Date()) {
  return Math.max(0, Date.parse(endsAt) - now.getTime());
}

export function formatCompetitionDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

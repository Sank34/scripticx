import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  calculateCompetitionMaximum,
  getCompetitionPhase,
} from "@/lib/competitions";
import type {
  CompetitionBreak,
  CompetitionDetail,
  CompetitionProblem,
  CompetitionSummary,
} from "@/lib/competitionTypes";
import { HttpError } from "@/lib/server/requestSecurity";

export type CompetitionRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  visibility: "public" | "private";
  status: "draft" | "published" | "cancelled";
  starts_at: string;
  ends_at: string;
  registration_ends_at: string | null;
  reminder_interval_minutes: number;
  show_live_leaderboard: boolean;
  created_at: string;
  created_by: string;
};

type CompetitionProblemRow = {
  id: string;
  competition_id: string;
  problem_id: string;
  max_points: number;
  position: number;
};

type ProblemRow = {
  id: string;
  code?: number | string | null;
  title_i18n: Record<string, string> | null;
  description_i18n: Record<string, string> | null;
  starter_code: string | null;
  difficulty: string | null;
  visibility?: string | null;
  publish_at?: string | null;
};

export function competitionId(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new HttpError(400, "Invalid competition id");
  }
  return value;
}

export async function listCompetitionSummaries(
  admin: SupabaseClient,
  userId: string,
  includeDrafts: boolean
): Promise<CompetitionSummary[]> {
  let query = admin
    .from("competitions")
    .select("*")
    .order("starts_at", { ascending: false });
  if (!includeDrafts) query = query.eq("status", "published");

  const { data: rows, error } = await query.returns<CompetitionRow[]>();
  if (error) throw error;
  if (!rows?.length) return [];

  const ids = rows.map((row) => row.id);
  const [{ data: participants, error: participantError }, { data: links, error: linkError }] =
    await Promise.all([
      admin
        .from("competition_participants")
        .select("competition_id, user_id, status")
        .in("competition_id", ids),
      admin
        .from("competition_problems")
        .select("competition_id, max_points")
        .in("competition_id", ids),
    ]);
  if (participantError) throw participantError;
  if (linkError) throw linkError;

  return rows
    .filter(
      (row) =>
        includeDrafts ||
        row.visibility === "public" ||
        (participants || []).some(
          (participant) =>
            participant.competition_id === row.id &&
            participant.user_id === userId &&
            participant.status === "active"
        )
    )
    .map((row) => {
      const competitionParticipants = (participants || []).filter(
        (participant) =>
          participant.competition_id === row.id && participant.status === "active"
      );
      const problemLinks = (links || []).filter(
        (link) => link.competition_id === row.id
      );
      return {
        ...row,
        isParticipant: competitionParticipants.some(
          (participant) => participant.user_id === userId
        ),
        participantCount: competitionParticipants.length,
        problemCount: problemLinks.length,
        maximumPoints: calculateCompetitionMaximum(problemLinks),
        phase: getCompetitionPhase(row),
      };
    });
}

export async function readCompetitionDetail(
  admin: SupabaseClient,
  id: string,
  userId: string,
  isAdmin: boolean
): Promise<CompetitionDetail> {
  const { data: competition, error } = await admin
    .from("competitions")
    .select("*")
    .eq("id", competitionId(id))
    .maybeSingle<CompetitionRow>();
  if (error) throw error;
  if (!competition) throw new HttpError(404, "Competition not found");
  if (!isAdmin && competition.status !== "published") {
    throw new HttpError(404, "Competition not found");
  }

  const [participantResult, breaksResult, linksResult, participantCountResult] =
    await Promise.all([
      admin
        .from("competition_participants")
        .select("status")
        .eq("competition_id", id)
        .eq("user_id", userId)
        .maybeSingle<{ status: string }>(),
      admin
        .from("competition_breaks")
        .select("id, title, starts_at, ends_at")
        .eq("competition_id", id)
        .order("starts_at", { ascending: true })
        .returns<CompetitionBreak[]>(),
      admin
        .from("competition_problems")
        .select("id, competition_id, problem_id, max_points, position")
        .eq("competition_id", id)
        .order("position", { ascending: true })
        .returns<CompetitionProblemRow[]>(),
      admin
        .from("competition_participants")
        .select("user_id", { count: "exact", head: true })
        .eq("competition_id", id)
        .eq("status", "active"),
    ]);
  if (participantResult.error) throw participantResult.error;
  if (breaksResult.error) throw breaksResult.error;
  if (linksResult.error) throw linksResult.error;
  if (participantCountResult.error) throw participantCountResult.error;

  const isParticipant = participantResult.data?.status === "active";
  const hasFullAccess =
    isAdmin || competition.visibility === "public" || isParticipant;
  if (!hasFullAccess && competition.status !== "published") {
    throw new HttpError(404, "Competition not found");
  }

  const links = linksResult.data || [];
  const problemIds = links.map((link) => link.problem_id);
  let problems: ProblemRow[] = [];
  if (problemIds.length) {
    const problemResult = await admin
      .from("problems")
      .select(
        "id, code, title_i18n, description_i18n, starter_code, difficulty, visibility, publish_at"
      )
      .in("id", problemIds)
      .returns<ProblemRow[]>();
    if (problemResult.error) throw problemResult.error;
    problems = problemResult.data || [];
  }

  const problemMap = new Map(problems.map((problem) => [problem.id, problem]));
  const phase = getCompetitionPhase(competition, breaksResult.data || []);
  const revealProblems = isAdmin || phase === "live" || phase === "break" || phase === "finished";
  const safeProblems: CompetitionProblem[] = revealProblems
    ? links.flatMap((link) => {
        const problem = problemMap.get(link.problem_id);
        if (!problem) return [];
        return [
          {
            id: link.id,
            problem_id: link.problem_id,
            max_points: link.max_points,
            position: link.position,
            problem: {
              ...problem,
              title_i18n: problem.title_i18n || {},
              description_i18n: problem.description_i18n || {},
              starter_code: problem.starter_code || "",
              difficulty: problem.difficulty || "easy",
              visibility: problem.visibility || undefined,
              publish_at: problem.publish_at || null,
            },
          },
        ];
      })
    : [];

  return {
    ...competition,
    access: hasFullAccess ? "full" : "invite_required",
    breaks: breaksResult.data || [],
    isParticipant,
    participantCount: participantCountResult.count || 0,
    problemCount: links.length,
    maximumPoints: calculateCompetitionMaximum(links),
    phase,
    problems: hasFullAccess ? safeProblems : [],
  };
}

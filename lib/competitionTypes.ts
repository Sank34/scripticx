import type { CompetitionPhase } from "@/lib/competitions";

export type CompetitionSummary = {
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
  participantCount: number;
  problemCount: number;
  maximumPoints: number;
  isParticipant: boolean;
  phase: CompetitionPhase;
};

export type CompetitionProblem = {
  id: string;
  problem_id: string;
  max_points: number;
  position: number;
  problem: {
    id: string;
    code?: number | string | null;
    title_i18n: Record<string, string>;
    description_i18n: Record<string, string>;
    starter_code: string;
    difficulty: string;
    visibility?: string;
    publish_at?: string | null;
  };
};

export type CompetitionBreak = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
};

export type CompetitionDetail = CompetitionSummary & {
  access: "full" | "invite_required";
  breaks: CompetitionBreak[];
  problems: CompetitionProblem[];
};

export type CompetitionLeaderboardEntry = {
  position: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  total_points: number;
  solved_count: number;
  last_submission_at: string | null;
};

export type CompetitionSubmission = {
  id: string;
  competition_id: string;
  competition_problem_id: string;
  user_id: string;
  code: string;
  score: number;
  points: number;
  passed_tests: number;
  total_tests: number;
  submitted_at: string;
};

export type StandardSubmission = {
  id: string;
  problem_id: string;
  code: string;
  score: number;
  created_at: string;
  verified_at?: string | null;
};

import type { EditorLanguageKey } from "@/lib/editor-project";

export const PROBLEM_SUBMISSION_LANGUAGES = {
  miniscript: { editor: "msp", extension: "msp", label: "MiniScript+" },
  python: { editor: "python", extension: "py", label: "Python" },
  cpp: { editor: "cpp", extension: "cpp", label: "C++" },
} as const satisfies Record<string, { editor: EditorLanguageKey; extension: string; label: string }>;

export type ProblemSubmissionLanguage = keyof typeof PROBLEM_SUBMISSION_LANGUAGES;

export const ALL_PROBLEM_SUBMISSION_LANGUAGES: readonly ProblemSubmissionLanguage[] =
  Object.keys(PROBLEM_SUBMISSION_LANGUAGES).filter(isProblemSubmissionLanguage);

export function getAllowedProblemLanguages(configured?: readonly ProblemSubmissionLanguage[] | null) {
  return configured
    ? ALL_PROBLEM_SUBMISSION_LANGUAGES.filter((language) => configured.includes(language))
    : ALL_PROBLEM_SUBMISSION_LANGUAGES;
}

export function isProblemSubmissionLanguage(value: unknown): value is ProblemSubmissionLanguage {
  return typeof value === "string" && Object.hasOwn(PROBLEM_SUBMISSION_LANGUAGES, value);
}

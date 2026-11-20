export type LessonLocale = "en" | "ro";

export type LocalizedText = {
  en: string;
  ro: string;
};

export type LessonQuizQuestion = {
  question: LocalizedText;
  options: LocalizedText[];
  answerIndex: number;
  explanation?: LocalizedText;
};

export type LearnLessonKind =
  | "interactive"
  | "theory"
  | "video"
  | "challenge"
  | "assessment";

export type LessonRuleKind = "required" | "bonus" | "challenge";

export type LessonCompletionRequirement =
  | "required"
  | "optional"
  | "bonus"
  | "capstone";

export type LearnLessonUnlockRule = {
  kind?: LessonRuleKind;
  locked?: boolean;
  requiredProblemCodes?: number[];
  requiresCorrectQuiz?: boolean;
};

export type LearnTheoryBlock = {
  heading: LocalizedText;
  body: LocalizedText;
  bullets?: LocalizedText[];
};

export type RecommendedProblem = {
  title: LocalizedText;
  topic: string;
  href: string;
  difficulty?: "easy" | "medium" | "hard";
  code?: number;
};

export type LearnChallenge = {
  prompt: LocalizedText;
  problem?: RecommendedProblem;
};

export type LearnLesson = {
  id: string;
  order: number;
  unit: LocalizedText;
  title: LocalizedText;
  summary: LocalizedText;
  transcript: LocalizedText;
  /** Canonical long-form lesson body. Transcript remains as a legacy fallback. */
  markdown?: LocalizedText;
  videoUrl?: string;
  tags: string[];
  level: "beginner" | "practice" | "challenge";
  minutes: number;
  sampleInput: string;
  code: string;
  quiz: LessonQuizQuestion[];
  recommendedProblems: RecommendedProblem[];
  kind?: LearnLessonKind;
  theory?: LearnTheoryBlock[];
  challenge?: LearnChallenge;
  completionRequirement?: LessonCompletionRequirement;
  unlockRule?: LearnLessonUnlockRule;
};

export type LearnSection = {
  id: string;
  order: number;
  pathSlug?: string;
  label: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  lessonIds: string[];
};

export function text(value: LocalizedText, locale: LessonLocale) {
  return value[locale] ?? value.en;
}

export function youtubeEmbedUrl(url?: string) {
  if (!url) return null;

  const match =
    url.match(/youtu\.be\/([^?]+)/) ??
    url.match(/[?&]v=([^&]+)/) ??
    url.match(/youtube\.com\/embed\/([^?]+)/);

  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function getLessonKind(lesson: LearnLesson): LearnLessonKind {
  if (lesson.kind) return lesson.kind;

  return lesson.level === "challenge" ? "challenge" : "video";
}

export const learnLessons: LearnLesson[] = [];
export const learnSections: LearnSection[] = [];

export const archivedFoundationLessonIds = new Set(["swap-variables","maximum-two-numbers","digits","sum-of-digits","reverse-number","palindrome","divisors","prime","gcd","factorial","euclidean-gcd","fibonacci-iterative","largest-power-of-two","digit-frequency","complexity-intro","linear-complexity","nested-loop-complexity","space-complexity"]);
export const archivedFoundationSectionIds = new Set(["fundamentals","digits","classic-algorithms","advanced-algorithms","complexity-basics","complexity-ast","variables","conditions","loops","divisibility","algorithms"]);

export type LessonRule = {
  kind: LessonRuleKind;
  requiresCorrectQuiz: boolean;
  requiredProblemCodes: number[];
};

export function getLessonCompletionRequirement(
  lesson: LearnLesson
): LessonCompletionRequirement {
  if (lesson.completionRequirement) return lesson.completionRequirement;
  return "required";
}

export function getLessonRule(lesson: LearnLesson): LessonRule {
  const kind = getLessonKind(lesson);
  const completionRequirement = getLessonCompletionRequirement(lesson);
  const firstRecommendedProblemCode = lesson.recommendedProblems[0]?.code;
  const isChallenge =
    kind === "challenge" ||
    lesson.level === "challenge";

  let rule: LessonRule;

  if (completionRequirement === "bonus") {
    rule = {
      kind: "bonus",
      requiresCorrectQuiz: false,
      requiredProblemCodes: [],
    };
  } else if (kind === "theory") {
    rule = {
      kind: "required",
      requiresCorrectQuiz: lesson.quiz.length > 0,
      requiredProblemCodes: [],
    };
  } else if (kind === "assessment") {
    rule = {
      kind: "challenge",
      requiresCorrectQuiz: true,
      requiredProblemCodes: [],
    };
  } else {
    rule = {
      kind: isChallenge ? "challenge" : "required",
      requiresCorrectQuiz: true,
      requiredProblemCodes:
        isChallenge && typeof firstRecommendedProblemCode === "number"
          ? [firstRecommendedProblemCode]
          : [],
    };
  }

  if (!lesson.unlockRule) return rule;

  if (lesson.unlockRule.locked === false) {
    return {
      kind: lesson.unlockRule.kind ?? rule.kind,
      requiresCorrectQuiz: false,
      requiredProblemCodes: [],
    };
  }

  return {
    kind: lesson.unlockRule.kind ?? rule.kind,
    requiresCorrectQuiz:
      lesson.unlockRule.requiresCorrectQuiz ?? rule.requiresCorrectQuiz,
    requiredProblemCodes:
      lesson.unlockRule.requiredProblemCodes ?? rule.requiredProblemCodes,
  };
}

import { describe, expect, it } from "vitest";

import {
  getLessonCompletionRequirement,
  getLessonRule,
  type LearnLesson,
} from "./learn-lessons";

function lesson(
  patch: Partial<LearnLesson> = {}
): LearnLesson {
  return {
    code: "",
    id: "custom-lesson",
    level: "beginner",
    minutes: 5,
    order: 1,
    quiz: [],
    recommendedProblems: [],
    sampleInput: "",
    summary: { en: "Summary", ro: "Rezumat" },
    tags: [],
    title: { en: "Lesson", ro: "Lecție" },
    transcript: { en: "Body", ro: "Conținut" },
    unit: { en: "Unit", ro: "Unitate" },
    ...patch,
  };
}

describe("learning path completion requirements", () => {
  it("keeps completion requirements separate from visual lesson kinds", () => {
    const capstoneTheory = lesson({
      completionRequirement: "capstone",
      kind: "theory",
    });

    expect(getLessonCompletionRequirement(capstoneTheory)).toBe("capstone");
    expect(getLessonRule(capstoneTheory)).toMatchObject({
      kind: "required",
      requiresCorrectQuiz: false,
    });
  });

  it("treats an explicit bonus as non-blocking even when it has a quiz", () => {
    const bonus = lesson({
      completionRequirement: "bonus",
      kind: "interactive",
      quiz: [
        {
          answerIndex: 0,
          options: [{ en: "Yes", ro: "Da" }],
          question: { en: "Ready?", ro: "Gata?" },
        },
      ],
    });

    expect(getLessonRule(bonus)).toEqual({
      kind: "bonus",
      requiredProblemCodes: [],
      requiresCorrectQuiz: false,
    });
  });

  it("keeps a theory lesson non-blocking when it is explicitly marked as bonus", () => {
    const bonusTheory = lesson({
      completionRequirement: "bonus",
      kind: "theory",
    });

    expect(getLessonRule(bonusTheory)).toEqual({
      kind: "bonus",
      requiredProblemCodes: [],
      requiresCorrectQuiz: false,
    });
  });
});

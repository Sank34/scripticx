import type { LearnLesson } from "../learn-lessons";

export function testLesson(patch: Partial<LearnLesson> = {}): LearnLesson {
  return {
    id: "example", order: 1, kind: "interactive", title: { en: "Example", ro: "Exemplu" },
    unit: { en: "Unit", ro: "Unitate" }, summary: { en: "", ro: "" }, transcript: { en: "", ro: "" },
    tags: [], level: "beginner", minutes: 5, code: "", sampleInput: "", recommendedProblems: [],
    completionRequirement: "required", unlockRule: { requiresCorrectQuiz: true, requiredProblemCodes: [] },
    quiz: [0, 1, 2].map(i => ({ question: { en: `Test ${i}`, ro: `Test ${i}` }, options: [{ en: "A", ro: "A" }, { en: "B", ro: "B" }, { en: "C", ro: "C" }], answerIndex: i, explanation: { en: "Test explanation", ro: "Explicație de test" } })),
    ...patch,
  };
}
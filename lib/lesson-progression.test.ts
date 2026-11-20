import { describe, expect, it } from "vitest";
import { testLesson } from "./test-fixtures/learning";
import { getRequiredPredecessors, hasPassingLessonQuiz, isLessonCleared } from "./lesson-progression";

const introCourseLessons = [testLesson({ id: "first" }), testLesson({ id: "second" }), testLesson({ id: "third" }), testLesson({ id: "assessment", unlockRule: { requiresCorrectQuiz: true, requiredProblemCodes: [20] } })];

describe("roadmap lesson prerequisites", () => {
  it("requires the introductory quiz before the second lesson", () => {
    const [first, second] = introCourseLessons;
    expect(getRequiredPredecessors(introCourseLessons, first.id)).toEqual([]);
    expect(getRequiredPredecessors(introCourseLessons, second.id)).toEqual([first]);
    expect(isLessonCleared(first, { completed: true }, new Set())).toBe(false);
    expect(isLessonCleared(first, { completed: true, quizScore: 2 }, new Set())).toBe(false);
    expect(isLessonCleared(first, { completed: false, quizScore: 3 }, new Set())).toBe(false);
    expect(isLessonCleared(first, { completed: true, quizScore: 3 }, new Set())).toBe(true);
  });
  it("keeps practice requirements in addition to the quiz", () => {
    const assessment = introCourseLessons[3];
    const passed = { completed: true, quizScore: assessment.quiz.length };
    expect(isLessonCleared(assessment, passed, new Set())).toBe(false);
    expect(isLessonCleared(assessment, passed, new Set([21]))).toBe(false);
    expect(isLessonCleared(assessment, passed, new Set([20]))).toBe(true);
  });
  it("does not require bonus or optional lessons to advance", () => {
    const [first, second, third] = introCourseLessons;
    expect(getRequiredPredecessors([{ ...first, completionRequirement: "bonus" }, { ...second, completionRequirement: "optional" }, third], third.id)).toEqual([]);
  });
  it("does not accept empty quizzes as a passing score", () => {
    expect(hasPassingLessonQuiz({ ...introCourseLessons[0], quiz: [] }, { completed: true, quizScore: 0 })).toBe(false);
  });
});

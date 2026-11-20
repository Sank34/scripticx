import { describe, expect, it } from "vitest";
import { testLesson } from "./test-fixtures/learning";
import { gradeLessonQuiz, randomizeLessonQuiz } from "./lesson-quiz";

describe("lesson quiz promotion", () => {
  for (const lesson of [testLesson(), testLesson({ id: "single-question", quiz: testLesson().quiz.slice(0, 1) })]) {
    it(`requires every correct answer in ${lesson.id}`, () => {
      const answers = Object.fromEntries(lesson.quiz.map((q, i) => [i, q.answerIndex]));
      expect(gradeLessonQuiz(lesson.quiz, answers).passed).toBe(true);
      expect(gradeLessonQuiz(lesson.quiz, {}).passed).toBe(false);
      for (let i = 0; i < lesson.quiz.length; i++) {
        const incomplete = { ...answers };
        delete incomplete[i];
        expect(gradeLessonQuiz(lesson.quiz, incomplete).passed).toBe(false);
        expect(gradeLessonQuiz(lesson.quiz, { ...answers, [i]: (lesson.quiz[i].answerIndex + 1) % lesson.quiz[i].options.length }).passed).toBe(false);
        expect(gradeLessonQuiz(lesson.quiz, { ...answers, [i]: -1 }).passed).toBe(false);
      }
    });
  }
  it("does not allow an empty quiz to complete a lesson", () => {
    expect(gradeLessonQuiz([], {}).passed).toBe(false);
  });
  it("preserves correct answers and explanations when shuffling questions and options", () => {
    const original = testLesson().quiz;
    const shuffled = randomizeLessonQuiz(original, () => 0);
    expect(shuffled.map(q => q.question)).not.toEqual(original.map(q => q.question));
    for (const question of shuffled) {
      const before = original.find(item => item.question === question.question)!;
      expect(question.options[question.answerIndex]).toBe(before.options[before.answerIndex]);
      expect(question.explanation).toBe(before.explanation);
    }
    expect(gradeLessonQuiz(shuffled, Object.fromEntries(shuffled.map((q, i) => [i, q.answerIndex]))).passed).toBe(true);
  });
});

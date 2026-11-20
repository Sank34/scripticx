import { getLessonCompletionRequirement, getLessonRule, type LearnLesson } from "./learn-lessons";

export type LessonProgress = { completed?: boolean; quizScore?: number };

export function hasPassingLessonQuiz(lesson: LearnLesson, progress?: LessonProgress) {
  return lesson.quiz.length > 0 && typeof progress?.quizScore === "number" && progress.quizScore >= lesson.quiz.length;
}

export function isLessonCleared(lesson: LearnLesson, progress: LessonProgress | undefined, solvedProblemCodes: ReadonlySet<number>) {
  return Boolean(progress?.completed) && hasPassingLessonQuiz(lesson, progress) && getLessonRule(lesson).requiredProblemCodes.every(code => solvedProblemCodes.has(code));
}

export function getRequiredPredecessors(orderedLessons: LearnLesson[], lessonId: string) {
  const index = orderedLessons.findIndex(lesson => lesson.id === lessonId);
  return orderedLessons.slice(0, Math.max(index, 0)).filter(lesson => {
    const requirement = getLessonCompletionRequirement(lesson);
    return requirement !== "optional" && requirement !== "bonus";
  });
}

import type { LessonQuizQuestion } from "./learn-lessons";

export function isValidLessonQuiz(questions: LessonQuizQuestion[]) {
  return questions.length > 0 && questions.every(question =>
    question.question.en.trim() && question.question.ro.trim() &&
    question.options.length >= 2 && question.options.every(option => option.en.trim() && option.ro.trim()) &&
    Number.isInteger(question.answerIndex) && question.answerIndex >= 0 && question.answerIndex < question.options.length
  );
}

export function randomizeLessonQuiz(questions: LessonQuizQuestion[], random = Math.random): LessonQuizQuestion[] {
  function shuffle<T>(items: T[]) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index--) {
      const target = Math.floor(random() * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }
  return shuffle(questions.map(question => {
    const options = shuffle(question.options.map((option, index) => ({ option, index })));
    return { ...question, options: options.map(item => item.option), answerIndex: options.findIndex(item => item.index === question.answerIndex) };
  }));
}

export function gradeLessonQuiz(questions: LessonQuizQuestion[], answers: Record<number, number>) {
  const answered = questions.filter((question, index) => Number.isInteger(answers[index]) && answers[index] >= 0 && answers[index] < question.options.length).length;
  const score = questions.filter((question, index) => answers[index] === question.answerIndex).length;
  return { answered, score, passed: questions.length > 0 && answered === questions.length && score === questions.length };
}

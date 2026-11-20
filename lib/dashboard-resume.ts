import { learningProgressVersion } from "@/lib/learning-progress-version";

function lessonKey(userId: string) {
  return `scripticx:last-lesson:${learningProgressVersion}:${userId}`;
}

export function readResumeLesson(userId: string) {
  try { return window.localStorage.getItem(lessonKey(userId)); }
  catch { return null; }
}

export function rememberResumeLesson(userId: string, lessonId: string) {
  try { window.localStorage.setItem(lessonKey(userId), lessonId); }
  catch { /* The roadmap remains available when storage is disabled. */ }
}

export function clearResumeLesson(userId: string, lessonId: string) {
  if (readResumeLesson(userId) !== lessonId) return;
  try { window.localStorage.removeItem(lessonKey(userId)); }
  catch { /* The lesson remains completed in account progress. */ }
}

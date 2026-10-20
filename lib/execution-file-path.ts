export function isSafeExecutionFilePath(value: string) {
  if (!value || value.length > 120 || /[\\:\x00-\x1f\x7f]/.test(value)) return false;
  return value.split("/").every(part => part && part !== "." && part !== ".." && part.toLowerCase() !== ".scripticx");
}

export function hasExecutionFileConflict(names: Set<string>, name: string) {
  const path = name.toLowerCase();
  return [...names].some(existing => existing === path || existing.startsWith(`${path}/`) || path.startsWith(`${existing}/`));
}

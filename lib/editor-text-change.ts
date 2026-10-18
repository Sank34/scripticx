export function getEditorTextChange(before: string, after: string) {
  if (before === after) return null;
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let end = before.length;
  let nextEnd = after.length;
  while (end > start && nextEnd > start && before[end - 1] === after[nextEnd - 1]) { end--; nextEnd--; }
  // Monaco offsets use UTF-16; never split a surrogate pair at an edit boundary.
  if (start > 0 && /[\uD800-\uDBFF]/.test(before[start - 1])) start--;
  if (end < before.length && /[\uDC00-\uDFFF]/.test(before[end])) { end++; nextEnd++; }
  return { start, end, text: after.slice(start, nextEnd) };
}

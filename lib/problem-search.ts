type ProblemSearchRecord = {
  code?: number | string | null;
  title: string;
  description: string;
};

/** Match problem text while treating #123 and 123 as the same problem code. */
export function matchesProblemSearch(
  problem: ProblemSearchRecord,
  value: string,
  locale?: string
) {
  const needle = value.trim().toLocaleLowerCase(locale);
  if (!needle) return true;

  const code = problem.code == null ? "" : String(problem.code);
  const codeNeedle = needle.replace(/^#\s*/, "");
  if (/^\d+$/.test(codeNeedle) && code === codeNeedle) return true;

  return [code, `#${code}`, problem.title, problem.description]
    .join(" ")
    .toLocaleLowerCase(locale)
    .includes(needle);
}

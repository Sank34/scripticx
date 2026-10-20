import { isCodeRunnerLanguage, type CodeRunnerFile } from "@/lib/code-runner";
import { HttpError, jsonObject, stringField } from "@/lib/server/requestSecurity";
import { hasExecutionFileConflict, isSafeExecutionFilePath } from "@/lib/execution-file-path";

export function parseCodeExecutionInput(value: unknown) {
  const body = jsonObject(value);
  if (!isCodeRunnerLanguage(body.language)) throw new HttpError(400, "Unsupported execution language");
  if (!Array.isArray(body.files) || body.files.length < 1 || body.files.length > 32) throw new HttpError(400, "Invalid execution files");
  const names = new Set<string>();
  let totalBytes = 0;
  const files = body.files.map((candidate): CodeRunnerFile => {
    const file = jsonObject(candidate);
    const name = stringField(file.name, { min: 1, max: 120 });
    const content = stringField(file.content, { max: 128_000, trim: false });
    if (!isSafeExecutionFilePath(name)) throw new HttpError(400, "Invalid execution file path");
    if (hasExecutionFileConflict(names, name)) throw new HttpError(400, "Conflicting execution file paths");
    names.add(name.toLowerCase());
    const bytes = new TextEncoder().encode(content).byteLength;
    if (bytes > 128_000) throw new HttpError(413, "Execution file is too large");
    totalBytes += bytes;
    if (totalBytes > 512_000) throw new HttpError(413, "Execution project is too large");
    return { name, content };
  });
  const stdin = body.stdin === undefined ? "" : stringField(body.stdin, { max: 16_000, trim: false });
  if (new TextEncoder().encode(stdin).byteLength > 16_000) throw new HttpError(413, "Execution input is too large");
  const rawArgs = body.args ?? [];
  if (!Array.isArray(rawArgs) || rawArgs.length > 16) throw new HttpError(400, "Invalid arguments");
  const args = rawArgs.map(argument => stringField(argument, { max: 256, trim: false }));
  return { language: body.language, files, stdin, args };
}

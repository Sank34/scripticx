import { NextResponse } from "next/server";

import {
  isCodeRunnerLanguage,
  type CodeRunnerFile,
} from "@/lib/code-runner";
import { executeCode } from "@/lib/server/codeRunner";
import {
  enforceRateLimit,
  HttpError,
  jsonObject,
  readJsonBody,
  requireUser,
  stringField,
} from "@/lib/server/requestSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

const MAX_FILES = 32;
const MAX_FILE_BYTES = 128_000;
const MAX_TOTAL_BYTES = 512_000;
const MAX_STDIN_BYTES = 16_000;

function executionFiles(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_FILES) {
    throw new HttpError(400, "Invalid execution files");
  }

  const names = new Set<string>();
  let totalBytes = 0;
  return value.map((candidate): CodeRunnerFile => {
    const file = jsonObject(candidate);
    const name = stringField(file.name, { min: 1, max: 120 });
    const content = stringField(file.content, { max: MAX_FILE_BYTES, trim: false });
    if (name.includes("/") || name.includes("\\") || name === "." || name === "..") {
      throw new HttpError(400, "Invalid execution file name");
    }
    const normalizedName = name.toLowerCase();
    if (names.has(normalizedName)) throw new HttpError(400, "Duplicate execution file name");
    names.add(normalizedName);
    const fileBytes = new TextEncoder().encode(content).byteLength;
    if (fileBytes > MAX_FILE_BYTES) throw new HttpError(413, "Execution file is too large");
    totalBytes += fileBytes;
    if (totalBytes > MAX_TOTAL_BYTES) throw new HttpError(413, "Execution project is too large");
    return { name, content };
  });
}

function executionArguments(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 16) throw new HttpError(400, "Invalid arguments");
  return value.map((argument) => stringField(argument, { max: 256, trim: false }));
}

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    await enforceRateLimit({
      key: user.id,
      action: "editor_code_execute",
      limit: 30,
      windowSeconds: 60,
    });

    const body = jsonObject(await readJsonBody(request, 650_000));
    if (!isCodeRunnerLanguage(body.language)) {
      throw new HttpError(400, "Unsupported execution language");
    }
    const stdin = body.stdin === undefined
      ? ""
      : stringField(body.stdin, { max: MAX_STDIN_BYTES, trim: false });

    const result = await executeCode({
      language: body.language,
      files: executionFiles(body.files),
      stdin,
      args: executionArguments(body.args),
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    if (!(error instanceof HttpError)) console.error("Code execution failed", error);
    const message = error instanceof HttpError ? error.message : "Code execution failed";
    return NextResponse.json({ error: message }, { status });
  }
}

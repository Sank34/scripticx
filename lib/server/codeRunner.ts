import "server-only";

import {
  CODE_RUNNER_LANGUAGE_MAP,
  type CodeExecutionResult,
  type CodeRunnerFile,
  type CodeRunnerLanguage,
  type CodeRunnerStage,
} from "@/lib/code-runner";
import { HttpError } from "@/lib/server/requestSecurity";

type PistonStage = {
  code?: number | null;
  cpu_time?: number | null;
  memory?: number | null;
  message?: string | null;
  output?: string;
  signal?: string | null;
  status?: string | null;
  stderr?: string;
  stdout?: string;
  wall_time?: number | null;
};

type PistonResponse = {
  compile?: PistonStage;
  language?: string;
  message?: string;
  run?: PistonStage;
  version?: string;
};

const MAX_STAGE_OUTPUT = 100_000;

function runnerExecuteUrl() {
  const configured = process.env.CODE_RUNNER_URL?.trim();
  if (!configured) {
    throw new HttpError(503, "Code execution service is not configured");
  }

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new HttpError(503, "Code execution service is not configured");
  }

  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && loopback)) {
    throw new HttpError(503, "Code execution service requires HTTPS");
  }

  if (!url.pathname.endsWith("/execute")) {
    url.pathname = `${url.pathname.replace(/\/$/, "")}/execute`;
  }
  return url;
}

function limited(value: unknown) {
  return typeof value === "string" ? value.slice(0, MAX_STAGE_OUTPUT) : "";
}

function normalizeStage(stage: PistonStage | undefined): CodeRunnerStage {
  const stdout = limited(stage?.stdout);
  const stderr = limited(stage?.stderr);
  return {
    code: typeof stage?.code === "number" ? stage.code : null,
    cpuTime: typeof stage?.cpu_time === "number" ? stage.cpu_time : null,
    memory: typeof stage?.memory === "number" ? stage.memory : null,
    message: typeof stage?.message === "string" ? stage.message.slice(0, 1_000) : null,
    output: limited(stage?.output) || `${stdout}${stderr}`.slice(0, MAX_STAGE_OUTPUT),
    signal: typeof stage?.signal === "string" ? stage.signal.slice(0, 80) : null,
    status: typeof stage?.status === "string" ? stage.status.slice(0, 40) : null,
    stderr,
    stdout,
    wallTime: typeof stage?.wall_time === "number" ? stage.wall_time : null,
  };
}

export async function executeCode(input: {
  args: string[];
  files: CodeRunnerFile[];
  language: CodeRunnerLanguage;
  stdin: string;
}): Promise<CodeExecutionResult> {
  const url = runnerExecuteUrl();
  const token = process.env.CODE_RUNNER_TOKEN?.trim();
  const startedAt = performance.now();
  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        language: CODE_RUNNER_LANGUAGE_MAP[input.language],
        version: "*",
        files: input.files,
        stdin: input.stdin,
        args: input.args,
        compile_timeout: 10_000,
        compile_cpu_time: 8_000,
        compile_memory_limit: 512 * 1024 * 1024,
        run_timeout: 5_000,
        run_cpu_time: 3_000,
        run_memory_limit: 256 * 1024 * 1024,
      }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new HttpError(504, "Code execution timed out");
    }
    throw new HttpError(502, "Code execution service is unavailable");
  }

  const payload = (await response.json().catch(() => null)) as PistonResponse | null;
  if (!response.ok || !payload?.run) {
    const message = payload?.message?.slice(0, 500);
    throw new HttpError(response.status >= 500 ? 502 : 422, message || "Code execution failed");
  }

  const compile = payload.compile ? normalizeStage(payload.compile) : null;
  const run = normalizeStage(payload.run);
  const success = (!compile || compile.code === 0) && run.code === 0 && !run.signal;

  return {
    compile,
    durationMs: Math.round(performance.now() - startedAt),
    language: payload.language || CODE_RUNNER_LANGUAGE_MAP[input.language],
    run,
    success,
    version: payload.version || "latest",
  };
}

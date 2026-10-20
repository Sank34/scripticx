import { getSupabaseSessionWithTimeout } from "@/lib/supabase-session";
import type { CodeRunnerFile } from "@/lib/code-runner";

export type ExecutionSessionStatus = {
  phase: "starting" | "installing" | "compiling" | "ready" | "running" | "exited" | "error";
  code: number | null;
  message?: string;
  events: Array<{ seq: number; stream: "stdout" | "stderr" | "system"; text: string }>;
};

async function sessionRequest<T>(options: { body?: unknown; token?: string; after?: number; signal?: AbortSignal }) {
  const { data } = await getSupabaseSessionWithTimeout(6_000);
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Authentication required");
  const response = await fetch(`/api/code/session${options.after !== undefined ? `?after=${options.after}` : ""}`, {
    method: options.body ? "POST" : "GET", cache: "no-store", signal: options.signal,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}`,
      ...(options.token ? { "x-scripticx-session": options.token } : {}),
    }, body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new Error(result?.error || `Execution session failed (${response.status})`);
  return result as T;
}

export const startExecutionSession = (execution: { files: CodeRunnerFile[]; args: string[]; stdin: string; language: "python" | "cpp" }, mode: "run" | "install") =>
  sessionRequest<{ token: string; expiresInMs: number }>({ body: { action: "start", mode, execution } });
export const pollExecutionSession = (token: string, after: number, signal?: AbortSignal) => sessionRequest<ExecutionSessionStatus>({ token, after, signal });
export const sendExecutionInput = (token: string, sequence: number, text: string, eof = false) => sessionRequest<{ ok: boolean }>({ token, body: { action: "input", sequence, text, eof } });
export const stopExecutionSession = (token: string) => sessionRequest<{ ok: boolean }>({ token, body: { action: "stop" } });

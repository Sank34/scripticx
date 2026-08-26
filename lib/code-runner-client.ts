import { getSupabaseSessionWithTimeout } from "@/lib/supabase-session";
import type {
  CodeExecutionResult,
  CodeRunnerFile,
  CodeRunnerLanguage,
} from "@/lib/code-runner";

export async function requestCodeExecution(
  input: {
    args: string[];
    files: CodeRunnerFile[];
    language: CodeRunnerLanguage;
    stdin: string;
  },
  signal?: AbortSignal
) {
  const { data } = await getSupabaseSessionWithTimeout(6_000);
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Authentication required");

  const response = await fetch("/api/code/execute", {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
    signal,
  });
  const payload = (await response.json().catch(() => null)) as
    | (CodeExecutionResult & { error?: string })
    | null;
  if (!response.ok || !payload) {
    throw new Error(payload?.error || `Code execution failed (${response.status})`);
  }
  return payload;
}

import { NextResponse } from "next/server";
import { CODE_RUNNER_LANGUAGE_MAP } from "@/lib/code-runner";
import { parseCodeExecutionInput } from "@/lib/server/codeExecutionInput";
import { runnerSessionRequest } from "@/lib/server/codeSessions";
import { enforceRateLimit, HttpError, jsonObject, readJsonBody, requireUser, stringField } from "@/lib/server/requestSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function tokenFrom(request: Request) {
  return stringField(request.headers.get("x-scripticx-session"), { min: 1, max: 2048 });
}
function fail(error: unknown) {
  return NextResponse.json({ error: error instanceof HttpError ? error.message : "Interactive execution failed" }, { status: error instanceof HttpError ? error.status : 500, headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    const body = jsonObject(await readJsonBody(request, 650_000));
    const starting = body.action === "start";
    await enforceRateLimit({ key: user.id, action: starting ? "editor_session_start" : "editor_session_input", limit: starting ? 5 : 120, windowSeconds: 60 });
    let payload;
    let token: string | undefined;
    if (starting) {
      if (body.mode !== "run" && body.mode !== "install") throw new HttpError(400, "Invalid session mode");
      const execution = parseCodeExecutionInput(body.execution);
      if (execution.language !== "python" && execution.language !== "cpp") throw new HttpError(400, "Interactive execution supports Python and C++");
      if (body.mode === "install" && execution.language !== "python") throw new HttpError(400, "Package installation is only available for Python");
      payload = { action: "start", mode: body.mode, execution: { ...execution, language: CODE_RUNNER_LANGUAGE_MAP[execution.language] } };
    } else if (body.action === "input") {
      token = tokenFrom(request);
      if (!Number.isInteger(body.sequence) || Number(body.sequence) < 1 || Number(body.sequence) > 1000 || typeof body.eof !== "boolean") throw new HttpError(400, "Invalid terminal input");
      payload = { action: "input", sequence: body.sequence, text: stringField(body.text, { max: 16_000, trim: false }), eof: body.eof };
    } else if (body.action === "stop") {
      token = tokenFrom(request);
      payload = { action: "stop" };
    } else throw new HttpError(400, "Invalid session action");
    return NextResponse.json(await runnerSessionRequest(user.id, { body: payload, token }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error); }
}
export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    await enforceRateLimit({ key: user.id, action: "editor_session_poll", limit: 180, windowSeconds: 60 });
    const after = Number(new URL(request.url).searchParams.get("after") ?? "0");
    if (!Number.isInteger(after) || after < 0 || after > 100_000) throw new HttpError(400, "Invalid output cursor");
    return NextResponse.json(await runnerSessionRequest(user.id, { after, token: tokenFrom(request) }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return fail(error); }
}

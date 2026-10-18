import "server-only";
import { HttpError } from "@/lib/server/requestSecurity";

export async function runnerSessionRequest(userId: string, options: { body?: unknown; token?: string; after?: number }) {
  let url: URL;
  try { url = new URL(process.env.CODE_RUNNER_URL?.trim() ?? ""); }
  catch { throw new HttpError(503, "Code execution service is not configured"); }
  const loopback = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && loopback && url.protocol === "http:")) throw new HttpError(503, "Code execution service requires HTTPS");
  url.pathname = `${url.pathname.replace(/\/(?:execute|session)\/?$/, "").replace(/\/$/, "")}/session`;
  url.search = "";
  if (options.after !== undefined) url.searchParams.set("after", String(options.after));
  const secret = process.env.CODE_RUNNER_TOKEN?.trim();
  if (!secret) throw new HttpError(503, "Interactive runner credentials are not configured");
  let response: Response;
  try {
    response = await fetch(url, {
      method: options.body ? "POST" : "GET", cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}`, "x-scripticx-user": userId,
        ...(options.token ? { "x-scripticx-session": options.token } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(options.body && !options.token ? 45_000 : 15_000),
    });
  } catch { throw new HttpError(502, "Interactive runner is unavailable"); }
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) throw new HttpError(response.status >= 500 ? 502 : response.status, result?.message || (response.status === 404 ? "Deploy the updated ScripticX Runner to enable interactive Python." : "Interactive execution failed"));
  return result;
}

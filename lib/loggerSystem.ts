import "server-only";

export type LogLevel = "debug" | "info" | "success" | "warn" | "error";
type LogContext = Record<string, unknown>;
const ansi = { reset: "\x1b[0m", dim: "\x1b[2m", cyan: "\x1b[36m", green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", magenta: "\x1b[35m" } as const;
const levelStyle: Record<LogLevel, { label: string; color: string }> = {
  debug: { label: "DEBUG", color: ansi.dim }, info: { label: "INFO ", color: ansi.cyan }, success: { label: "OK   ", color: ansi.green }, warn: { label: "WARN ", color: ansi.yellow }, error: { label: "ERROR", color: ansi.red },
};
function formatValue(value: unknown) { if (value instanceof Error) return value.stack || value.message; if (typeof value === "string") return value; try { return JSON.stringify(value); } catch { return String(value); } }
function write(level: LogLevel, scope: string, message: string, context?: LogContext) {
  if (process.env.NODE_ENV === "test" && process.env.SCRIPTICX_LOG_TESTS !== "1") return;
  const style = levelStyle[level]; const timestamp = new Date().toISOString().slice(11, 23);
  const suffix = context && Object.keys(context).length ? ` ${ansi.dim}${Object.entries(context).map(([key, value]) => `${key}=${formatValue(value)}`).join(" ")}${ansi.reset}` : "";
  console.log(`${ansi.dim}${timestamp}${ansi.reset} ${style.color}${style.label}${ansi.reset} ${ansi.magenta}[${scope}]${ansi.reset} ${message}${suffix}`);
}
export const logger = {
  debug: (scope: string, message: string, context?: LogContext) => write("debug", scope, message, context),
  info: (scope: string, message: string, context?: LogContext) => write("info", scope, message, context),
  success: (scope: string, message: string, context?: LogContext) => write("success", scope, message, context),
  warn: (scope: string, message: string, context?: LogContext) => write("warn", scope, message, context),
  error: (scope: string, message: string, context?: LogContext) => write("error", scope, message, context),
};
export function logRequest(scope: string, method: string, path: string, status: number, startedAt: number) {
  const level: LogLevel = status >= 500 ? "error" : status >= 400 ? "warn" : "success";
  logger[level](scope, `${method} ${path}`, { status, duration: `${Date.now() - startedAt}ms` });
}

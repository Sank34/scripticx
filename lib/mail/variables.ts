import { HttpError } from "@/lib/server/requestSecurity";

export const MAIL_VARIABLES = [
  "first_name",
  "username",
  "email",
  "action_url",
  "unsubscribe_url",
] as const;

export type MailVariables = Record<(typeof MAIL_VARIABLES)[number], string>;
const supportedVariables = new Set<string>(MAIL_VARIABLES);
const tokenPattern = /{{\s*([a-z_][a-z0-9_]*)\s*}}/gi;

export function unknownMailVariables(...sources: Array<string | null | undefined>) {
  const unknown = new Set<string>();
  for (const source of sources) {
    if (!source) continue;
    for (const match of source.matchAll(tokenPattern)) {
      const name = match[1].toLowerCase();
      if (!supportedVariables.has(name)) unknown.add(name);
    }
  }
  return [...unknown];
}

export function assertSupportedMailVariables(...sources: Array<string | null | undefined>) {
  const unknown = unknownMailVariables(...sources);
  if (unknown.length) {
    throw new HttpError(400, `Unsupported email variables: ${unknown.join(", ")}`);
  }
}

export function interpolateMailVariables(source: string, values: MailVariables) {
  return source.replace(tokenPattern, (_token, rawName: string) => {
    const name = rawName.toLowerCase() as keyof MailVariables;
    return supportedVariables.has(name) ? values[name] : "";
  });
}


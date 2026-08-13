import { HttpError, jsonObject, stringField } from "@/lib/server/requestSecurity";
import type { CampaignAudience, MailMode } from "@/lib/mail/types";

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const LOCAL_PART_PATTERN = /^[a-z0-9](?:[a-z0-9._+-]{0,62}[a-z0-9])?$/;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function emailAddress(value: unknown, required = true) {
  if (!required && (value === null || value === undefined || value === "")) return null;
  const email = stringField(value, { min: 3, max: 254 }).toLowerCase();
  if (!EMAIL_PATTERN.test(email) || /[\r\n]/.test(email)) {
    throw new HttpError(400, "Invalid email address");
  }
  return email;
}

export function senderName(value: unknown) {
  const name = stringField(value, { min: 1, max: 80 });
  if (/[\r\n<>]/.test(name)) throw new HttpError(400, "Invalid sender name");
  return name;
}

export function senderLocalPart(value: unknown) {
  const localPart = stringField(value, { min: 1, max: 64 }).toLowerCase();
  if (!LOCAL_PART_PATTERN.test(localPart)) {
    throw new HttpError(400, "Invalid ScripticX sender address");
  }
  return localPart;
}

export function mailMode(value: unknown, fallback: MailMode = "html"): MailMode {
  if (value === undefined || value === null || value === "") return fallback;
  if (value !== "html" && value !== "plain") {
    throw new HttpError(400, "Invalid email mode");
  }
  return value;
}

export function mailSubject(value: unknown) {
  const subject = stringField(value, { min: 1, max: 180 });
  if (/[\r\n]/.test(subject)) throw new HttpError(400, "Invalid email subject");
  return subject;
}

export function optionalText(value: unknown, max: number) {
  if (value === undefined || value === null || value === "") return null;
  return stringField(value, { max });
}

export function mailContent(value: unknown) {
  return stringField(value, { min: 1, max: 100_000, trim: false });
}

export function safeActionUrl(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const raw = stringField(value, { min: 1, max: 2_000 });
  if (/{{\s*(?:action_url|unsubscribe_url)\s*}}/i.test(raw)) {
    throw new HttpError(400, "Recursive URL variables are not allowed");
  }
  const candidate = raw.replace(/{{\s*[a-z_][a-z0-9_]*\s*}}/gi, "sample");
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return raw;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) {
      throw new Error("unsafe protocol");
    }
    return raw.includes("{{") ? raw : url.toString();
  } catch {
    throw new HttpError(400, "Invalid email action URL");
  }
}

export function campaignAudience(value: unknown): CampaignAudience {
  const audience = jsonObject(value);
  if (audience.type === "subscribers" || audience.type === undefined) {
    return { type: "subscribers" };
  }
  if (audience.type === "segment") {
    if (!["students", "teachers", "admins"].includes(String(audience.segment))) {
      throw new HttpError(400, "Invalid campaign segment");
    }
    return {
      type: "segment",
      segment: audience.segment as "students" | "teachers" | "admins",
    };
  }
  if (audience.type === "users") {
    if (!Array.isArray(audience.userIds) || audience.userIds.length > 500) {
      throw new HttpError(400, "Invalid campaign users");
    }
    const userIds = [...new Set(audience.userIds)];
    if (!userIds.length || userIds.some((id) => typeof id !== "string" || !UUID_PATTERN.test(id))) {
      throw new HttpError(400, "Invalid campaign users");
    }
    return { type: "users", userIds };
  }
  throw new HttpError(400, "Invalid campaign audience");
}

export function booleanField(value: unknown, label: string) {
  if (typeof value !== "boolean") throw new HttpError(400, `Invalid ${label}`);
  return value;
}

export function isoDate(value: unknown, options: { future?: boolean } = {}) {
  const raw = stringField(value, { min: 20, max: 40 });
  const timestamp = Date.parse(raw);
  if (!Number.isFinite(timestamp) || (options.future && timestamp <= Date.now() + 30_000)) {
    throw new HttpError(400, "Invalid schedule date");
  }
  return new Date(timestamp).toISOString();
}

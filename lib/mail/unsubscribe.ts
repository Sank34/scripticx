import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { absoluteUrl } from "@/lib/metadata";

type MarketingCategory = "newsletter" | "product_updates";
const TOKEN_VERSION = "v1";

function signingSecret() {
  const secret = process.env.MAIL_UNSUBSCRIBE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Mail unsubscribe signing secret is not configured");
  }
  return secret;
}

function signature(payload: string) {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function createUnsubscribeToken(
  userId: string,
  category: MarketingCategory,
  expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365
) {
  const payload = `${TOKEN_VERSION}.${expiresAt}.${category}.${userId}`;
  return `${payload}.${signature(payload)}`;
}

export function verifyUnsubscribeToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 5 || parts[0] !== TOKEN_VERSION) return null;
  const [version, expiresRaw, categoryRaw, userId, suppliedSignature] = parts;
  if (categoryRaw !== "newsletter" && categoryRaw !== "product_updates") return null;
  const expiresAt = Number(expiresRaw);
  if (!Number.isInteger(expiresAt) || expiresAt < Math.floor(Date.now() / 1000)) return null;
  const payload = `${version}.${expiresRaw}.${categoryRaw}.${userId}`;
  const expected = Buffer.from(signature(payload));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  return { userId, category: categoryRaw as MarketingCategory, expiresAt };
}

export function unsubscribeUrl(userId: string, category: MarketingCategory) {
  const token = createUnsubscribeToken(userId, category);
  return absoluteUrl(`/api/mail/unsubscribe?token=${encodeURIComponent(token)}`);
}

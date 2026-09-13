export const PLATFORM_ACCESS_COOKIE = "scripticx_platform_access";
export const PLATFORM_ACCESS_TTL_SECONDS = 5 * 60;

export type PlatformAccessPayload = {
  exp: number;
  role: string;
  userId: string;
};

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importKey(secret: string) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign", "verify"]
  );
}

export async function signPlatformAccessToken(
  payload: PlatformAccessPayload,
  secret: string
) {
  const encodedPayload = toBase64Url(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    await importKey(secret),
    new TextEncoder().encode(encodedPayload)
  );
  return `${encodedPayload}.${toBase64Url(new Uint8Array(signature))}`;
}

export async function verifyPlatformAccessToken(
  token: string | undefined,
  secret: string
): Promise<PlatformAccessPayload | null> {
  if (!token) return null;
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return null;

  try {
    const payloadBytes = fromBase64Url(encodedPayload);
    const signatureBytes = fromBase64Url(encodedSignature);
    if (
      toBase64Url(payloadBytes) !== encodedPayload ||
      toBase64Url(signatureBytes) !== encodedSignature
    ) {
      return null;
    }

    const valid = await crypto.subtle.verify(
      "HMAC",
      await importKey(secret),
      signatureBytes,
      new TextEncoder().encode(encodedPayload)
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(payloadBytes)
    ) as PlatformAccessPayload;
    if (
      !payload ||
      typeof payload.userId !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getPlatformAccessSecret() {
  return (
    process.env.PLATFORM_ACCESS_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

import "server-only";

import { lookup } from "node:dns/promises";
import { request as requestHttp } from "node:http";
import { request as requestHttps } from "node:https";
import { isIP, type LookupFunction } from "node:net";

const MAX_REDIRECTS = 3;
export const MAX_EXTERNAL_IMAGE_BYTES = 4 * 1024 * 1024;
const supportedTypes = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function fetchPublicImage(source: string) {
  const deadline = Date.now() + 10_000;
  let current = await resolvePublicImageTarget(source, deadline);

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    const response = await requestPinnedImage(current, deadline);
    if (response.redirect) {
      const location = response.redirect;
      if (!location || redirect === MAX_REDIRECTS) throw new Error("Too many redirects");
      current = await resolvePublicImageTarget(new URL(location, current.url).href, deadline);
      continue;
    }
    if (!response.image) throw new Error("Image request failed");
    return response.image;
  }

  throw new Error("Image request failed");
}

export async function validatePublicImageUrl(source: string) {
  return (await resolvePublicImageTarget(source, Date.now() + 10_000)).url.href;
}

async function resolvePublicImageTarget(source: string, deadline: number) {
  if (!source || source.length > 2_048) throw new Error("Invalid image URL");
  const url = new URL(source);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Invalid image protocol");
  }
  if (url.username || url.password) throw new Error("URL credentials are not allowed");
  if (
    url.port &&
    !(
      (url.protocol === "http:" && url.port === "80") ||
      (url.protocol === "https:" && url.port === "443")
    )
  ) {
    throw new Error("Non-standard ports are not allowed");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".home.arpa")
  ) {
    throw new Error("Private hosts are not allowed");
  }

  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error("Image request timed out");
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) as 4 | 6 }]
    : await withDeadline(lookup(hostname, { all: true, verbatim: true }), remaining);
  if (!addresses.length || addresses.some(({ address }) => !isPublicIpAddress(address))) {
    throw new Error("Private network addresses are not allowed");
  }
  url.hash = "";
  return { address: addresses[0].address, family: addresses[0].family, url };
}

export function isPublicIpAddress(address: string) {
  const version = isIP(address);
  if (version === 4) return isPublicIpv4(address);
  if (version !== 6) return false;

  const parts = expandIpv6(address);
  if (!parts) return false;
  if (parts.slice(0, 5).every((part) => part === 0) && parts[5] === 0xffff) {
    const mapped = `${parts[6] >> 8}.${parts[6] & 255}.${parts[7] >> 8}.${parts[7] & 255}`;
    return isPublicIpv4(mapped);
  }
  // Only globally routable unicast IPv6 is useful for this proxy. This also
  // rejects loopback, link-local, ULA, multicast and transition mechanisms.
  if ((parts[0] & 0xe000) !== 0x2000) return false;
  if (parts[0] === 0x2001 && parts[1] === 0x0db8) return false;
  if (parts[0] === 0x2001 && parts[1] === 0x0000) return false;
  if (parts[0] === 0x2001 && parts[1] === 0x0002 && parts[2] === 0) return false;
  if (parts[0] === 0x2001 && (parts[1] & 0xfff0) === 0x0010) return false;
  if (parts[0] === 0x2001 && (parts[1] & 0xfff0) === 0x0020) return false;
  if (parts[0] === 0x2002) return false;
  return true;
}

function isPublicIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
  if (a === 192 && b === 88 && c === 99) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

function expandIpv6(address: string) {
  const clean = address.toLowerCase().split("%", 1)[0];
  const ipv4Match = clean.match(/(\d+\.\d+\.\d+\.\d+)$/);
  let normalized = clean;
  if (ipv4Match) {
    const octets = ipv4Match[1].split(".").map(Number);
    if (octets.some((part) => part < 0 || part > 255)) return null;
    normalized = `${clean.slice(0, -ipv4Match[1].length)}${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
  }
  const halves = normalized.split("::");
  if (halves.length > 2) return null;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || missing < 0) return null;
  const values = [...left, ...Array(missing).fill("0"), ...right].map((part) =>
    Number.parseInt(part || "0", 16)
  );
  return values.length === 8 && values.every((part) => Number.isFinite(part) && part <= 0xffff)
    ? values
    : null;
}

type PublicImageTarget = Awaited<ReturnType<typeof resolvePublicImageTarget>>;

export function createPinnedLookup(address: string, family: number): LookupFunction {
  return (_hostname, options, callback) => {
    if (options.all) {
      callback(null, [{ address, family }]);
    } else {
      callback(null, address, family);
    }
  };
}

async function withDeadline<T>(promise: Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Image request timed out")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function requestPinnedImage(target: PublicImageTarget, deadline: number) {
  return new Promise<
    | { image: { bytes: Uint8Array; mimeType: string }; redirect?: never }
    | { image?: never; redirect: string }
  >((resolve, reject) => {
    let settled = false;
    let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
    const finishResolve = (
      value:
        | { image: { bytes: Uint8Array; mimeType: string }; redirect?: never }
        | { image?: never; redirect: string }
    ) => {
      if (settled) return;
      settled = true;
      if (deadlineTimer) clearTimeout(deadlineTimer);
      resolve(value);
    };
    const finishReject = (error: Error) => {
      if (settled) return;
      settled = true;
      if (deadlineTimer) clearTimeout(deadlineTimer);
      reject(error);
    };
    const request = (target.url.protocol === "https:" ? requestHttps : requestHttp)(
      target.url,
      {
        agent: false,
        headers: {
          Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif;q=0.9",
          "User-Agent": "ScripticX-Note-Export/1.0",
        },
        lookup: createPinnedLookup(target.address, target.family),
        method: "GET",
      },
      (response) => {
        const status = response.statusCode || 0;
        if (status >= 300 && status < 400) {
          const location = response.headers.location;
          response.destroy();
          if (!location) finishReject(new Error("Invalid redirect"));
          else finishResolve({ redirect: location });
          return;
        }
        if (status < 200 || status >= 300) {
          response.destroy();
          finishReject(new Error("Image request failed"));
          return;
        }

        const mimeType = String(response.headers["content-type"] || "")
          .split(";", 1)[0]
          .trim()
          .toLowerCase();
        if (!supportedTypes.has(mimeType)) {
          response.destroy();
          finishReject(new Error("Unsupported image type"));
          return;
        }
        const declaredSize = Number(response.headers["content-length"] || 0);
        if (declaredSize > MAX_EXTERNAL_IMAGE_BYTES) {
          response.destroy();
          finishReject(new Error("Image is too large"));
          return;
        }

        const chunks: Uint8Array[] = [];
        let size = 0;
        response.on("data", (chunk: Buffer) => {
          size += chunk.byteLength;
          if (size > MAX_EXTERNAL_IMAGE_BYTES) {
            finishReject(new Error("Image is too large"));
            response.destroy();
            return;
          }
          chunks.push(chunk);
        });
        response.on("end", () => {
          const bytes = new Uint8Array(size);
          let offset = 0;
          for (const chunk of chunks) {
            bytes.set(chunk, offset);
            offset += chunk.byteLength;
          }
          if (!matchesImageSignature(mimeType, bytes)) {
            finishReject(new Error("Invalid image data"));
            return;
          }
          finishResolve({ image: { bytes, mimeType } });
        });
        response.on("error", (error) => finishReject(error));
      }
    );
    deadlineTimer = setTimeout(() => {
      finishReject(new Error("Image request timed out"));
      request.destroy();
    }, Math.max(1, deadline - Date.now()));
    request.on("error", (error) => finishReject(error));
    request.end();
  });
}

function matchesImageSignature(type: string, bytes: Uint8Array) {
  if (type === "image/avif") {
    const brand = new TextDecoder().decode(bytes.slice(4, 32));
    return brand.includes("ftypavif") || brand.includes("ftypavis");
  }
  if (type === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (byte, index) => bytes[index] === byte
    );
  }
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/gif") {
    const header = new TextDecoder().decode(bytes.slice(0, 6));
    return header === "GIF87a" || header === "GIF89a";
  }
  return (
    type === "image/webp" &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
  );
}

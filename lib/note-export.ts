import { getWorkspaceImage } from "@/lib/workspace-assets";

const MAX_EXPORT_IMAGE_BYTES = 8 * 1024 * 1024;
const WORKSPACE_IMAGE_DESTINATION =
  /(!\[(?:\\.|[^\]])*\]\(\s*<?)(workspace-image:\/\/([a-zA-Z0-9_-]{8,128}))(>?)(?=[\s)])/g;
const WORKSPACE_IMAGE_REFERENCE_DESTINATION =
  /(^ {0,3}\[[^\]\n]+\]:\s*<?)(workspace-image:\/\/([a-zA-Z0-9_-]{8,128}))(>?)(?=[\s\n]|$)/gm;
const supportedImageTypes = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type PreparedNoteExportSurface = {
  cleanup: () => void;
  omittedImages: number;
  surface: HTMLElement;
};

export async function buildPortableNoteMarkdown(
  markdown: string,
  userId?: string
) {
  if (!userId) return { markdown, omittedImages: 0 };

  const protectedRanges = markdownCodeRanges(markdown);
  const ids = new Set<string>();
  for (const pattern of [WORKSPACE_IMAGE_DESTINATION, WORKSPACE_IMAGE_REFERENCE_DESTINATION]) {
    for (const match of markdown.matchAll(pattern)) {
      if (
        protectedRanges.some(
          ([start, end]) => (match.index ?? 0) >= start && (match.index ?? 0) < end
        )
      ) {
        continue;
      }
      ids.add(match[3]);
    }
  }
  if (!ids.size) return { markdown, omittedImages: 0 };

  const resolved = new Map<string, string | null>();
  await mapWithConcurrency([...ids], 3, async (assetId) => {
    const blob = await getWorkspaceImage(userId, assetId).catch(() => null);
    resolved.set(assetId, blob ? await imageBlobToDataUrl(blob).catch(() => null) : null);
  });

  let omittedImages = 0;
  const missing = new Set<string>();
  const replaceDestination = (
    full: string,
    prefix: string,
    source: string,
    assetId: string,
    suffix: string,
    offset: number
  ) => {
    if (protectedRanges.some(([start, end]) => offset >= start && offset < end)) return full;
    const dataUrl = resolved.get(assetId);
    if (!dataUrl) {
      missing.add(assetId);
      return full;
    }
    return `${prefix}${dataUrl}${suffix}`;
  };
  const portable = markdown
    .replace(WORKSPACE_IMAGE_DESTINATION, replaceDestination)
    .replace(WORKSPACE_IMAGE_REFERENCE_DESTINATION, replaceDestination);
  omittedImages = missing.size;
  return { markdown: portable, omittedImages };
}

function markdownCodeRanges(markdown: string) {
  const ranges: Array<[number, number]> = [];
  const lines = markdown.matchAll(/.*(?:\n|$)/g);
  let fence: { character: string; length: number; start: number } | null = null;

  for (const match of lines) {
    if (!match[0]) continue;
    const lineStart = match.index;
    if (!fence && /^(?: {4}|\t)/.test(match[0])) {
      ranges.push([lineStart, lineStart + match[0].length]);
      continue;
    }
    const marker = match[0].match(/^ {0,3}(`{3,}|~{3,})/);
    if (marker) {
      const character = marker[1][0];
      if (!fence) {
        fence = { character, length: marker[1].length, start: lineStart };
      } else if (fence.character === character && marker[1].length >= fence.length) {
        ranges.push([fence.start, lineStart + match[0].length]);
        fence = null;
      }
    }
    if (fence) continue;

    const line = match[0];
    for (let index = 0; index < line.length; index += 1) {
      if (line[index] !== "`") continue;
      let run = 1;
      while (line[index + run] === "`") run += 1;
      const closing = line.indexOf("`".repeat(run), index + run);
      if (closing < 0) break;
      ranges.push([lineStart + index, lineStart + closing + run]);
      index = closing + run - 1;
    }
  }
  if (fence) ranges.push([fence.start, markdown.length]);
  return ranges;
}

export async function prepareNoteExportSurface(
  source: HTMLElement,
  options: { ro: boolean; userId?: string }
): Promise<PreparedNoteExportSurface> {
  const clone = source.cloneNode(true) as HTMLElement;
  const markers = Array.from(
    clone.querySelectorAll<HTMLElement>(
      "img[data-note-image-source], [data-workspace-image-id]"
    )
  );
  const cache = new Map<string, Promise<string | null>>();
  let omittedImages = 0;

  const resolveOnce = (key: string, resolver: () => Promise<Blob | null>) => {
    const existing = cache.get(key);
    if (existing) return existing;
    const pending = resolver()
      .then((blob) => (blob ? imageBlobToDataUrl(blob) : null))
      .catch(() => null);
    cache.set(key, pending);
    return pending;
  };

  await mapWithConcurrency(markers, 3, async (marker) => {
    const assetId = marker.dataset.workspaceImageId;
    const sourceUrl = marker.dataset.noteImageSource;
    const key = assetId ? `workspace:${assetId}` : `url:${sourceUrl || ""}`;
    const dataUrl = await resolveOnce(key, () =>
      assetId && options.userId
        ? getWorkspaceImage(options.userId, assetId)
        : sourceUrl
          ? fetchNoteExportImage(sourceUrl)
          : Promise.resolve(null)
    );

    if (!dataUrl) {
      omittedImages += 1;
      replaceWithImageFallback(marker, options.ro);
      return;
    }

    const image =
      marker instanceof HTMLImageElement
        ? marker
        : createExportImage(marker, marker.dataset.noteImageAlt || "");
    image.src = dataUrl;
    image.loading = "eager";
    image.decoding = "sync";
    image.removeAttribute("crossorigin");
    image.removeAttribute("referrerpolicy");
    image.removeAttribute("srcset");
    image.removeAttribute("data-note-image-source");
    image.removeAttribute("data-workspace-image-id");
  });

  clone.querySelectorAll("script, iframe, object, embed").forEach((element) => element.remove());
  clone.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      if (attribute.name.toLowerCase().startsWith("on")) {
        element.removeAttribute(attribute.name);
      }
    }
  });

  const stage = document.createElement("div");
  stage.setAttribute("aria-hidden", "true");
  Object.assign(stage.style, {
    left: "-20000px",
    pointerEvents: "none",
    position: "fixed",
    top: "0",
    width: `${Math.max(1, source.getBoundingClientRect().width || 840)}px`,
    zIndex: "-2147483648",
  });
  clone.style.opacity = "1";
  clone.style.width = "100%";
  stage.append(clone);
  document.body.append(stage);

  try {
    await waitForDecodedImages(clone);
  } catch {
    stage.remove();
    throw new Error(
      options.ro ? "Imaginile nu au putut fi pregătite." : "Images could not be prepared."
    );
  }

  return {
    cleanup: () => stage.remove(),
    omittedImages,
    surface: clone,
  };
}

export function imageBlobToDataUrl(blob: Blob) {
  if (!supportedImageTypes.has(blob.type) || !blob.size || blob.size > MAX_EXPORT_IMAGE_BYTES) {
    return Promise.reject(new Error("Unsupported export image."));
  }
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Could not read image."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

async function fetchNoteExportImage(source: string) {
  if (source.startsWith("data:")) {
    const response = await fetch(source);
    return validatedImageBlob(response);
  }

  try {
    const direct = await fetchWithTimeout(
      source,
      {
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
      },
      8_000
    );
    if (direct.ok) return await validatedImageBlob(direct);
  } catch {
    // Cross-origin images commonly need the authenticated server proxy below.
  }

  if (!/^https?:\/\//i.test(source)) return null;
  const { supabase } = await import("@/lib/supabase");
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  const response = await fetchWithTimeout(
    "/api/workspace/export-image",
    {
      body: JSON.stringify({ url: source }),
      cache: "no-store",
      credentials: "same-origin",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
    10_000
  );
  return response.ok ? validatedImageBlob(response) : null;
}

async function validatedImageBlob(response: Response) {
  const mimeType = (response.headers.get("content-type") || "")
    .split(";", 1)[0]
    .trim()
    .toLowerCase();
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (
    !supportedImageTypes.has(mimeType) ||
    declaredSize > MAX_EXPORT_IMAGE_BYTES ||
    !response.body
  ) {
    await response.body?.cancel().catch(() => undefined);
    return null;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_EXPORT_IMAGE_BYTES) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  const parts = chunks.map(
    (chunk) =>
      chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer
  );
  return size ? new Blob(parts, { type: mimeType }) : null;
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
) {
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        await worker(items[index]);
      }
    })
  );
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

function createExportImage(marker: HTMLElement, alt: string) {
  const image = document.createElement("img");
  image.alt = alt;
  image.className =
    "block h-auto w-full max-w-full rounded-xl border bg-muted/20 object-contain shadow-sm";
  const frame = marker.parentElement;
  const hasExplicitWidth = Boolean(frame?.style.width && frame.style.width !== "fit-content");
  Object.assign(image.style, {
    display: "block",
    height: "auto",
    margin: "0",
    maxWidth: "100%",
    width: hasExplicitWidth ? "100%" : "auto",
  });
  marker.replaceWith(image);
  return image;
}

function replaceWithImageFallback(marker: HTMLElement, ro: boolean) {
  const fallback = document.createElement("span");
  const alt =
    marker.dataset.noteImageAlt ||
    (marker instanceof HTMLImageElement ? marker.alt : "");
  fallback.textContent = alt
    ? `[${alt}]`
    : ro
      ? "[Imagine indisponibilă]"
      : "[Image unavailable]";
  fallback.setAttribute("aria-label", alt || (ro ? "Imagine indisponibilă" : "Image unavailable"));
  fallback.setAttribute("role", "img");
  fallback.className =
    "flex min-h-24 min-w-40 items-center justify-center rounded-xl border border-dashed px-4 text-center text-xs";
  marker.replaceWith(fallback);
}

async function waitForDecodedImages(surface: HTMLElement) {
  const images = Array.from(surface.querySelectorAll("img"));
  await Promise.all(
    images.map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve, reject) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => reject(new Error("Image failed to load.")), {
            once: true,
          });
        });
      }
      if (typeof image.decode === "function") await image.decode().catch(() => undefined);
      if (!image.naturalWidth) throw new Error("Image failed to decode.");
    })
  );
}

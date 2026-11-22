import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n";

export const siteConfig = {
  name: "ScripticX",
  shortName: "ScripticX",
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://platform.scripticx.org",
  description:
    "A programming learning platform with MiniScript+, an interactive editor, step-by-step execution, automatic evaluation, complexity analysis, and live collaboration.",
  logo: "/scripticx-logo-lung.png",
  socialImage: "/social-card.png",
  keywords: [
    "ScripticX",
    "MiniScript+",
    "learn programming",
    "programming education platform",
    "online code editor",
    "algorithmic thinking",
    "automatic code evaluation",
    "complexity analysis",
    "step-by-step debugger",
    "live coding",
  ],
} as const;

// The organization is defined on the main site; these @ids must match
// scripticx-landing/lib/structured-data.tsx so Google merges both into one entity.
const mainSiteUrl = "https://www.scripticx.org";

export const organization = {
  id: `${mainSiteUrl}/#organization`,
  platformId: `${mainSiteUrl}/#platform`,
  name: "ScripticX",
  url: mainSiteUrl,
  logo: `${mainSiteUrl}/icons/notification-icon-512.png`,
  sameAs: [
    "https://github.com/Sank34/scripticx",
    "https://www.youtube.com/@scripticx",
    "https://www.youtube.com/@ScripticXLessons",
    "https://www.linkedin.com/company/scripticx/",
    "https://www.instagram.com/scripticx/",
  ],
} as const;

type PageMetadataOptions = {
  title: string;
  description: string;
  path?: string;
  image?: string | null;
  noIndex?: boolean;
  type?: "website" | "article" | "profile";
  keywords?: string[];
  section?: string;
  locale?: Locale;
};

export function absoluteUrl(path = "/") {
  return new URL(path, siteConfig.url).toString();
}

export function createPageMetadata({
  title,
  description,
  path = "/",
  image,
  noIndex = false,
  type = "website",
  keywords = [],
  section = siteConfig.name,
  locale = "en",
}: PageMetadataOptions): Metadata {
  const canonical = absoluteUrl(path);
  const generatedImage = absoluteUrl(
    `/api/social-image?title=${encodeURIComponent(title)}&description=${encodeURIComponent(description)}&section=${encodeURIComponent(section)}&path=${encodeURIComponent(path)}`
  );
  const images = image
    ? [image.startsWith("http") ? image : absoluteUrl(image)]
    : [generatedImage];

  return {
    title,
    description,
    keywords: [...siteConfig.keywords, ...keywords],
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: locale === "ro" ? "ro_RO" : "en_US",
      type,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
          noarchive: true,
        }
      : {
          index: true,
          follow: true,
        },
  };
}

export function createNotFoundMetadata(entity: string): Metadata {
  return {
    title: `${entity} unavailable`,
    description:
      "The requested content is unavailable or can no longer be accessed.",
    robots: {
      index: false,
      follow: false,
      noarchive: true,
    },
  };
}

export function localizedMetadataText(
  value: unknown,
  fallback: string
): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!value || typeof value !== "object") return fallback;

  const localized = value as Record<string, unknown>;
  const candidate = localized.en;

  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : fallback;
}

export function metadataExcerpt(value: unknown, fallback: string, max = 160) {
  const text = localizedMetadataText(value, fallback)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`~[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

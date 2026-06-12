import type { Metadata } from "next";

export const siteConfig = {
  name: "ScripticX",
  shortName: "ScripticX",
  url:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://platform.scripticx.org",
  description:
    "Platformă educațională pentru învățarea programării cu MiniScript+, editor interactiv, execuție pas cu pas, evaluare automată, analiză de complexitate și colaborare live.",
  descriptionEn:
    "A programming learning platform with MiniScript+, an interactive editor, step-by-step execution, automatic evaluation, complexity analysis, and live collaboration.",
  logo: "/scripticx-logo-lung.png",
  socialImage: "/opengraph-image",
  keywords: [
    "ScripticX",
    "MiniScript+",
    "învățare programare",
    "platformă educațională",
    "editor de cod online",
    "algoritmică",
    "evaluare automată",
    "analiză complexitate",
    "debugger pas cu pas",
    "live coding",
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
}: PageMetadataOptions): Metadata {
  const canonical = absoluteUrl(path);
  const images = image
    ? [image.startsWith("http") ? image : absoluteUrl(image)]
    : [absoluteUrl(siteConfig.socialImage)];

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
      locale: "ro_RO",
      alternateLocale: ["en_US"],
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
    title: `${entity} indisponibil`,
    description:
      "Conținutul solicitat nu este disponibil sau nu mai poate fi accesat.",
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
  const candidate = localized.ro || localized.en || Object.values(localized)[0];

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

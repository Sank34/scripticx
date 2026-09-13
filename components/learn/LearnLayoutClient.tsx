"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

const docsPages = [
  { href: "/docs/basics", key: "basics" },
  { href: "/docs/variables", key: "variables" },
  { href: "/docs/loops", key: "loops" },
  { href: "/docs/input-output", key: "io" },
];

function readTranslation(source: unknown, keys: string[]) {
  let value: unknown = source;

  for (const key of keys) {
    if (!value || typeof value !== "object") return null;
    value = (value as Record<string, unknown>)[key];
  }

  return typeof value === "string" ? value : null;
}

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const { locale } = useLanguage();

  const t = (key: string) => {
    const keys = key.split(".");
    return (
      readTranslation(translations[locale], keys) ??
      readTranslation(translations.en, keys) ??
      key
    );
  };

  if (pathname === "/learn" || pathname.startsWith("/learn/lesson")) {
    return <div className="min-h-full">{children}</div>;
  }

  const currentIndex = docsPages.findIndex((page) => page.href === pathname);

  const prev = currentIndex > 0 ? docsPages[currentIndex - 1] : null;
  const next = currentIndex >= 0 ? docsPages[currentIndex + 1] : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/docs/basics">{t("learn.docs")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {currentIndex >= 0 && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink>
                  {t(`learn.pages.${docsPages[currentIndex]?.key}`)}
                </BreadcrumbLink>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div>{children}</div>

      <Pagination>
        <PaginationContent className="justify-between w-full">

          <PaginationItem>
            {prev ? (
              <PaginationPrevious
                onClick={() => router.push(prev.href)}
                className="cursor-pointer"
              />
            ) : (
              <span />
            )}
          </PaginationItem>

          <PaginationItem>
            {next ? (
              <PaginationNext
                onClick={() => router.push(next.href)}
                className="cursor-pointer"
              />
            ) : (
              <span />
            )}
          </PaginationItem>

        </PaginationContent>
      </Pagination>

    </div>
  );
}

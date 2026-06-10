"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

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
  { href: "/learn", key: "introduction" },
  { href: "/learn/basics", key: "basics" },
  { href: "/learn/variables", key: "variables" },
  { href: "/learn/loops", key: "loops" },
  { href: "/learn/input-output", key: "io" },
];

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
    let value: any = translations[locale];

    for (const k of keys) value = value?.[k];
    if (value) return value;

    let fallback: any = translations["en"];
    for (const k of keys) fallback = fallback?.[k];
    return fallback || key;
  };

  const currentIndex = docsPages.findIndex(p => p.href === pathname);

  const prev = currentIndex > 0 ? docsPages[currentIndex - 1] : null;
  const next = currentIndex >= 0 ? docsPages[currentIndex + 1] : null;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/learn">{t("learn.docs")}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {currentIndex > 0 && (
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

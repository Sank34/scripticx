"use client";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

import { Card, CardContent } from "@/components/ui/card";

import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

export default function LearnPage() {
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

  return (
    <div className="space-y-6">

      {/* <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/learn">Docs</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Introduction</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb> */}

      <div className="space-y-2">
        <h1 className="text-4xl font-bold">{t("learn.title")}</h1>
        <p className="text-muted-foreground">
          {t("learn.subtitle")}
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">

          <div>
            <h2 className="text-xl font-semibold">{t("learn.sections.what.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.sections.what.text")}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.sections.example.title")}</h2>

            <pre className="bg-muted p-4 rounded text-sm font-mono overflow-auto">
{`X = 0
WHILE X < 3
PRINT X
X = X + 1
END`}
            </pre>

          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.sections.how.title")}</h2>
            <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1 mt-2">
              {t("learn.sections.how.bullets").map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}
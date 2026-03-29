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

export default function BasicsPage() {
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
            <BreadcrumbPage>Basics</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb> */}

      <div className="space-y-2">
        <h1 className="text-4xl font-bold">{t("learn.basicsPage.title")}</h1>
        <p className="text-muted-foreground">
          {t("learn.basicsPage.subtitle")}
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">

          <div>
            <h2 className="text-xl font-semibold">{t("learn.basicsPage.sections.statements.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.basicsPage.sections.statements.text")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`PRINT "Hello"
PRINT "World"`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.basicsPage.sections.variables.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.basicsPage.sections.variables.text")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 5
PRINT X`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.basicsPage.sections.math.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.basicsPage.sections.math.text")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`A = 5 + 3
B = A * 2
PRINT B`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.basicsPage.sections.conditions.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.basicsPage.sections.conditions.text")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 10
IF X > 5 THEN
PRINT "Big"
END`}
            </pre>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}
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

export default function LoopsPage() {
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
            <BreadcrumbPage>Loops</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb> */}

      <div className="space-y-2">
        <h1 className="text-4xl font-bold">{t("learn.loopsPage.title")}</h1>
        <p className="text-muted-foreground">
          {t("learn.loopsPage.subtitle")}
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">

          <div>
            <h2 className="text-xl font-semibold">{t("learn.loopsPage.sections.while.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.loopsPage.sections.while.text")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 0
WHILE X < 3
PRINT X
X = X + 1
END`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.loopsPage.sections.how.title")}</h2>
            <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1 mt-2">
              {t("learn.loopsPage.sections.how.bullets").map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.loopsPage.sections.example.title")}</h2>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 0        # start
WHILE X < 3   # check condition
PRINT X       # output
X = X + 1     # update
END`}
            </pre>

            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.loopsPage.sections.example.output")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-2">
{`0
1
2`}
            </pre>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.loopsPage.sections.infinite.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.loopsPage.sections.infinite.text")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`WHILE true
PRINT "Hello"
END`}
            </pre>

            <p className="text-xs text-muted-foreground mt-2">
               {t("learn.loopsPage.sections.infinite.note")}
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("learn.loopsPage.sections.mistake.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("learn.loopsPage.sections.mistake.text")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 0
WHILE X < 5
PRINT X
END`}
            </pre>

            <p className="text-xs text-red-500 mt-2">
               {t("learn.loopsPage.sections.mistake.warning")}
            </p>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}
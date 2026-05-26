"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

export default function BasicsPage() {
  const { locale } = useLanguage();
  const router = useRouter();

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

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">{t("examples.basics.title")}</h1>
        <p className="text-muted-foreground">
          {t("examples.basics.subtitle")}
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">

          {/* PRINT */}
          <div>
            <h2 className="text-xl font-semibold">{t("examples.basics.print.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("examples.basics.print.description")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`PRINT "Hello"
PRINT "World"`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`PRINT "Hello"\nPRINT "World"`)}`)
              }
            >
              {t("examples.basics.run")}
            </Button>
          </div>

          {/* VARIABLES */}
          <div>
            <h2 className="text-xl font-semibold">{t("examples.basics.variables.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("examples.basics.variables.description")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 5
PRINT X`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`X = 5\nPRINT X`)}`)
              }
            >
              {t("examples.basics.run")}
            </Button>
          </div>

          {/* MATH */}
          <div>
            <h2 className="text-xl font-semibold">{t("examples.basics.math.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("examples.basics.math.description")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`A = 5 + 3
B = A * 2
PRINT B`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`A = 5 + 3\nB = A * 2\nPRINT B`)}`)
              }
            >
              {t("examples.basics.run")}
            </Button>
          </div>

          {/* CONDITIONS */}
          <div>
            <h2 className="text-xl font-semibold">{t("examples.basics.conditions.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("examples.basics.conditions.description")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 10
IF X > 5 THEN
  PRINT "Big"
END`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`X = 10\nIF X > 5 THEN\n  PRINT "Big"\nEND`)}`)
              }
            >
              {t("examples.basics.run")}
            </Button>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}

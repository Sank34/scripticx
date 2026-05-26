"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

export default function ConditionsPage() {
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

  return (
    <div className="space-y-6">

      <div className="space-y-2">
        <h1 className="text-4xl font-bold">{t("examples.conditions.title")}</h1>
        <p className="text-muted-foreground">
          {t("examples.conditions.subtitle")}
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">

          <div>
            <h2 className="text-xl font-semibold">{t("examples.conditions.simpleIf.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("examples.conditions.simpleIf.description")}
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
              {t("examples.conditions.run")}
            </Button>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("examples.conditions.ifElse.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("examples.conditions.ifElse.description")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 3
IF X > 5 THEN
  PRINT "Big"
ELSE
  PRINT "Small"
END`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`X = 3\nIF X > 5 THEN\n  PRINT "Big"\nELSE\n  PRINT "Small"\nEND`)}`)
              }
            >
              {t("examples.conditions.run")}
            </Button>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("examples.conditions.evenOdd.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("examples.conditions.evenOdd.description")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 4
IF X % 2 = 0 THEN
  PRINT "Even"
ELSE
  PRINT "Odd"
END`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`X = 4\nIF X % 2 = 0 THEN\n  PRINT "Even"\nELSE\n  PRINT "Odd"\nEND`)}`)
              }
            >
              {t("examples.conditions.run")}
            </Button>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("examples.conditions.maxTwo.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("examples.conditions.maxTwo.description")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`A = 5
B = 8

IF A > B THEN
  PRINT A
ELSE
  PRINT B
END`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`A = 5\nB = 8\n\nIF A > B THEN\n  PRINT A\nELSE\n  PRINT B\nEND`)}`)
              }
            >
              {t("examples.conditions.run")}
            </Button>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}

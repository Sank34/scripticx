"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

export default function LoopsPage() {
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
        <h1 className="text-4xl font-bold">{t("examples.loops.title")}</h1>
        <p className="text-muted-foreground">
          {t("examples.loops.subtitle")}
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">

          <div>
            <h2 className="text-xl font-semibold">{t("examples.loops.while.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("examples.loops.while.description")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 0
WHILE X < 5
PRINT X
X = X + 1
END`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`X = 0\nWHILE X < 5\nPRINT X\nX = X + 1\nEND`)}`)
              }
            >
              {t("examples.loops.run")}
            </Button>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("examples.loops.sum.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("examples.loops.sum.description")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`N = 5
SUM = 0
X = 1

WHILE X <= N
SUM = SUM + X
X = X + 1
END

PRINT SUM`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`N = 5\nSUM = 0\nX = 1\n\nWHILE X <= N\nSUM = SUM + X\nX = X + 1\nEND\n\nPRINT SUM`)}`)
              }
            >
              {t("examples.loops.run")}
            </Button>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("examples.loops.countdown.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("examples.loops.countdown.description")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 5
WHILE X >= 0
PRINT X
X = X - 1
END`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`X = 5\nWHILE X >= 0\nPRINT X\nX = X - 1\nEND`)}`)
              }
            >
              {t("examples.loops.run")}
            </Button>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("examples.loops.inputLoop.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("examples.loops.inputLoop.description")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`X = 0
WHILE X < 3
INPUT A
PRINT A
X = X + 1
END`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`X = 0\nWHILE X < 3\nINPUT A\nPRINT A\nX = X + 1\nEND`)}`)
              }
            >
              {t("examples.loops.run")}
            </Button>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}

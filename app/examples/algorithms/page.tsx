"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

export default function AlgorithmsPage() {
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
        <h1 className="text-4xl font-bold">{t("examples.algorithms.title")}</h1>
        <p className="text-muted-foreground">
          {t("examples.algorithms.subtitle")}
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">

          <div>
            <h2 className="text-xl font-semibold">{t("examples.algorithms.prime.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("examples.algorithms.prime.description")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`N = 7
DIV = 2
IS_PRIME = 1

WHILE DIV < N
  IF N % DIV = 0 THEN
    IS_PRIME = 0
  END
  DIV = DIV + 1
END

IF IS_PRIME = 1 THEN
  PRINT "Prime"
ELSE
  PRINT "Not Prime"
END`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`N = 7\nDIV = 2\nIS_PRIME = 1\n\nWHILE DIV < N\n  IF N % DIV = 0 THEN\n    IS_PRIME = 0\n  END\n  DIV = DIV + 1\nEND\n\nIF IS_PRIME = 1 THEN\n  PRINT "Prime"\nELSE\n  PRINT "Not Prime"\nEND`)}`)
              }
            >
              {t("examples.algorithms.run")}
            </Button>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("examples.algorithms.fibonacci.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("examples.algorithms.fibonacci.description")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`N = 5
A = 0
B = 1
COUNT = 0

WHILE COUNT < N
  PRINT A
  TEMP = A + B
  A = B
  B = TEMP
  COUNT = COUNT + 1
END`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`N = 5\nA = 0\nB = 1\nCOUNT = 0\n\nWHILE COUNT < N\n  PRINT A\n  TEMP = A + B\n  A = B\n  B = TEMP\n  COUNT = COUNT + 1\nEND`)}`)
              }
            >
              {t("examples.algorithms.run")}
            </Button>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("examples.algorithms.gcd.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("examples.algorithms.gcd.description")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`A = 12
B = 8

WHILE A != B
  IF A > B THEN
    A = A - B
  ELSE
    B = B - A
  END
END

PRINT A`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`A = 12\nB = 8\n\nWHILE A != B\n  IF A > B THEN\n    A = A - B\n  ELSE\n    B = B - A\n  END\nEND\n\nPRINT A`)}`)
              }
            >
              {t("examples.algorithms.run")}
            </Button>
          </div>

          <div>
            <h2 className="text-xl font-semibold">{t("examples.algorithms.findMax.title")}</h2>
            <p className="text-sm text-muted-foreground mt-2">
              {t("examples.algorithms.findMax.description")}
            </p>

            <pre className="bg-muted p-4 rounded text-sm font-mono mt-3">
{`A = 3
B = 7
C = 5

MAX = A

IF B > MAX THEN
  MAX = B
END

IF C > MAX THEN
  MAX = C
END

PRINT MAX`}
            </pre>

            <Button
              size="sm"
              className="mt-2"
              onClick={() =>
                router.push(`/editor?code=${encodeURIComponent(`A = 3\nB = 7\nC = 5\n\nMAX = A\n\nIF B > MAX THEN\n  MAX = B\nEND\n\nIF C > MAX THEN\n  MAX = C\nEND\n\nPRINT MAX`)}`)
              }
            >
              {t("examples.algorithms.run")}
            </Button>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}

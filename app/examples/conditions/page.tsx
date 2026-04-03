"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function ConditionsPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Conditions</h1>
        <p className="text-muted-foreground">
          Control your program using IF statements
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">

          {/* SIMPLE IF */}
          <div>
            <h2 className="text-xl font-semibold">Simple IF</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Execute code only if a condition is true.
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
                router.push(`/editor?code=${encodeURIComponent(`X = 10\nIF X > 5 THEN\nPRINT "Big"\nEND`)}`)
              }
            >
              Run
            </Button>
          </div>

          {/* IF ELSE */}
          <div>
            <h2 className="text-xl font-semibold">IF / ELSE</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Choose between two paths.
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
                router.push(`/editor?code=${encodeURIComponent(`X = 3\nIF X > 5 THEN\nPRINT "Big"\nELSE\nPRINT "Small"\nEND`)}`)
              }
            >
              Run
            </Button>
          </div>

          {/* EVEN / ODD */}
          <div>
            <h2 className="text-xl font-semibold">Even or Odd</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Check if a number is even or odd.
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
                router.push(`/editor?code=${encodeURIComponent(`X = 4\nIF X % 2 = 0 THEN\nPRINT "Even"\nELSE\nPRINT "Odd"\nEND`)}`)
              }
            >
              Run
            </Button>
          </div>

          {/* MAX OF TWO */}
          <div>
            <h2 className="text-xl font-semibold">Max of two numbers</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Find the larger number between two values.
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
                router.push(`/editor?code=${encodeURIComponent(`A = 5\nB = 8\n\nIF A > B THEN\nPRINT A\nELSE\nPRINT B\nEND`)}`)
              }
            >
              Run
            </Button>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}
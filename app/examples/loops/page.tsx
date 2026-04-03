"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function LoopsPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Loops</h1>
        <p className="text-muted-foreground">
          Learn how to repeat actions using loops
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">

          {/* WHILE BASIC */}
          <div>
            <h2 className="text-xl font-semibold">While loop</h2>
            <p className="text-sm text-muted-foreground mt-2">
              A WHILE loop runs as long as the condition is true.
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
              Run
            </Button>
          </div>

          {/* SUM 1 TO N */}
          <div>
            <h2 className="text-xl font-semibold">Sum from 1 to N</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Calculate the sum of numbers from 1 to N.
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
              Run
            </Button>
          </div>

          {/* COUNTDOWN */}
          <div>
            <h2 className="text-xl font-semibold">Countdown</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Loop backwards from a number to zero.
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
              Run
            </Button>
          </div>

          {/* INPUT LOOP */}
          <div>
            <h2 className="text-xl font-semibold">Loop with input</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Ask the user for input multiple times.
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
              Run
            </Button>
          </div>

        </CardContent>
      </Card>

    </div>
  );
}
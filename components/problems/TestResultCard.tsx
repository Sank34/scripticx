"use client";

export type ProblemTestResult = {
  expected: string;
  got: string;
  input: unknown[] | string;
  passed: boolean;
};

type TestResultCardLabels = {
  correct: string;
  programPrinted: string;
  programRead: string;
  shouldHavePrinted: string;
  test: string;
  wrong: string;
};

type TestResultCardProps = {
  index: number;
  labels: TestResultCardLabels;
  result: ProblemTestResult;
};

export function TestResultCard({ index, labels, result }: TestResultCardProps) {
  const inputDisplay = Array.isArray(result.input)
    ? result.input.join(" ")
    : String(result.input);

  return (
    <div className="overflow-hidden rounded-lg border bg-card text-card-foreground">
      <div className="flex items-center justify-between border-b bg-muted/60 px-4 py-2.5">
        <p className="text-sm font-semibold text-foreground">
          {labels.test} #{index + 1}
        </p>
        <span
          className={`rounded px-2 py-1 text-xs font-medium ${
            result.passed
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
              : "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300"
          }`}
        >
          {result.passed ? labels.correct : labels.wrong}
        </span>
      </div>

      <div className="space-y-3 p-4">
        <TestOutputBlock
          label={labels.programRead}
          value={inputDisplay || "-"}
        />

        <TestOutputBlock
          label={labels.programPrinted}
          value={result.got || "-"}
        />

        {!result.passed && (
          <TestOutputBlock
            label={labels.shouldHavePrinted}
            value={result.expected}
          />
        )}
      </div>
    </div>
  );
}

function TestOutputBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <pre className="whitespace-pre-wrap break-all rounded bg-muted px-3 py-2 font-mono text-xs text-foreground">
        {value}
      </pre>
    </div>
  );
}

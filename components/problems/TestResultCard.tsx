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
    <div className="sx-surface overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/25 px-4 py-2.5">
        <p className="text-sm font-semibold text-foreground">
          {labels.test} #{index + 1}
        </p>
        <span
          className={`rounded-[var(--sx-radius-control)] px-2 py-1 text-xs font-medium ${
            result.passed
              ? "bg-[var(--sx-success-soft)] text-[var(--sx-success)]"
              : "bg-destructive/10 text-destructive"
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
      <pre className="whitespace-pre-wrap break-all rounded-[var(--sx-radius-control)] bg-muted/60 px-3 py-2 font-mono text-xs text-foreground">
        {value}
      </pre>
    </div>
  );
}

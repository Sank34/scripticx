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
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2.5">
        <p className="text-sm font-semibold text-zinc-900">
          {labels.test} #{index + 1}
        </p>
        <span
          className={`rounded px-2 py-1 text-xs font-medium ${
            result.passed
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
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
      <p className="mb-1.5 text-xs font-medium text-zinc-500">{label}</p>
      <pre className="whitespace-pre-wrap break-all rounded bg-zinc-100 px-3 py-2 font-mono text-xs">
        {value}
      </pre>
    </div>
  );
}

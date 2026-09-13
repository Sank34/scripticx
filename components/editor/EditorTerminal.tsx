"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { ChevronRight, CircleStop, Eraser, Play, TextCursorInput } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  buildCodeRunnerFiles,
  isCloudRunnableLanguage,
  resolveTerminalExecution,
  type CodeExecutionResult,
} from "@/lib/code-runner";
import { requestCodeExecution } from "@/lib/code-runner-client";
import type { ProjectFile } from "@/lib/editor-project";
import { cn } from "@/lib/utils";

type TerminalEntry = {
  id: number;
  kind: "command" | "error" | "stderr" | "stdout" | "system";
  text: string;
};

export type EditorTerminalHandle = {
  clear: () => void;
  runActiveFile: () => Promise<void>;
  stop: () => void;
};

type EditorTerminalProps = {
  activeFile?: ProjectFile;
  files: ProjectFile[];
  locale: "en" | "ro";
  onRunningChange?: (running: boolean) => void;
  projectName: string;
};

const HELP_EN = `Available commands:
  run [file] -- [args]     Run a supported project file
  python [file] [args]     Run Python
  g++ [file] [args]        Compile and run C++
  gcc [file] [args]        Compile and run C
  node [file] [args]       Run JavaScript
  ts-node [file] [args]    Run TypeScript
  java, go, rustc, dotnet, bash
  stdin [text]             Set program input
  ls, pwd, clear, help`;

const HELP_RO = `Comenzi disponibile:
  run [fișier] -- [args]   Rulează un fișier compatibil
  python [fișier] [args]   Rulează Python
  g++ [fișier] [args]      Compilează și rulează C++
  gcc [fișier] [args]      Compilează și rulează C
  node [fișier] [args]     Rulează JavaScript
  ts-node [fișier] [args]  Rulează TypeScript
  java, go, rustc, dotnet, bash
  stdin [text]             Configurează intrarea programului
  ls, pwd, clear, help`;

export const EditorTerminal = forwardRef<EditorTerminalHandle, EditorTerminalProps>(
  function EditorTerminal(
    { activeFile, files, locale, onRunningChange, projectName },
    forwardedRef
  ) {
    const ro = locale === "ro";
    const [entries, setEntries] = useState<TerminalEntry[]>([]);
    const [command, setCommand] = useState("");
    const [stdin, setStdin] = useState("");
    const [stdinOpen, setStdinOpen] = useState(false);
    const [running, setRunning] = useState(false);
    const [history, setHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const nextEntryId = useRef(1);
    const outputRef = useRef<HTMLDivElement | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    function append(kind: TerminalEntry["kind"], text: string) {
      if (!text) return;
      setEntries((current) => [
        ...current.slice(-399),
        { id: nextEntryId.current++, kind, text },
      ]);
    }

    function clear() {
      setEntries([]);
    }

    function stop() {
      abortRef.current?.abort();
    }

    async function execute(file: ProjectFile, args: string[], shownCommand: string) {
      if (running) return;
      if (!isCloudRunnableLanguage(file.language)) {
        append("error", ro ? "Fișierul nu are un runtime configurat." : "The file does not have a configured runtime.");
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setRunning(true);
      onRunningChange?.(true);
      append("command", `$ ${shownCommand}`);
      try {
        const result = await requestCodeExecution(
          {
            language: file.language,
            files: buildCodeRunnerFiles(file, files),
            stdin,
            args,
          },
          controller.signal
        );
        renderResult(result);
      } catch (error) {
        if (controller.signal.aborted) {
          append("system", ro ? "Proces oprit." : "Process stopped.");
        } else {
          append("error", error instanceof Error ? error.message : (ro ? "Execuția a eșuat." : "Execution failed."));
        }
      } finally {
        abortRef.current = null;
        setRunning(false);
        onRunningChange?.(false);
      }
    }

    function renderResult(result: CodeExecutionResult) {
      if (result.compile?.stdout) append("stdout", result.compile.stdout);
      if (result.compile?.stderr) append("stderr", result.compile.stderr);
      if (result.compile?.message) append("system", result.compile.message);
      if (result.run.stdout) append("stdout", result.run.stdout);
      if (result.run.stderr) append("stderr", result.run.stderr);
      if (result.run.message) append("system", result.run.message);

      const code = result.run.code ?? result.compile?.code ?? null;
      append(
        result.success ? "system" : "error",
        `${ro ? "Proces încheiat" : "Process exited"}${code === null ? "" : ` (${code})`} · ${result.durationMs} ms · ${result.language} ${result.version}`
      );
    }

    async function runActiveFile() {
      if (!activeFile) return;
      if (activeFile.language === "msp") return;
      await execute(activeFile, [], `run ${activeFile.path}`);
    }

    async function submitCommand() {
      const source = command.trim();
      if (!source || running) return;
      setCommand("");
      setHistory((current) => [...current.filter((item) => item !== source), source].slice(-50));
      setHistoryIndex(-1);

      const [name, ...rest] = source.split(/\s+/);
      const normalized = name.toLowerCase();
      if (normalized === "clear") {
        clear();
        return;
      }
      if (normalized === "help") {
        append("command", `$ ${source}`);
        append("system", ro ? HELP_RO : HELP_EN);
        return;
      }
      if (normalized === "pwd") {
        append("command", `$ ${source}`);
        append("stdout", `/workspace/${projectName.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase() || "project"}`);
        return;
      }
      if (normalized === "ls") {
        append("command", `$ ${source}`);
        append("stdout", files.map((file) => file.path).sort().join("\n") || (ro ? "Proiect gol" : "Empty project"));
        return;
      }
      if (normalized === "stdin") {
        append("command", `$ ${source}`);
        if (rest.join(" ").toLowerCase() === "clear") {
          setStdin("");
          append("system", ro ? "Intrarea programului a fost eliminată." : "Program input cleared.");
        } else if (rest.length) {
          setStdin(rest.join(" ").replace(/\\n/g, "\n"));
          append("system", ro ? "Intrarea programului a fost actualizată." : "Program input updated.");
        } else {
          setStdinOpen(true);
          append("stdout", stdin || (ro ? "Intrarea programului este goală." : "Program input is empty."));
        }
        return;
      }

      const resolved = resolveTerminalExecution(source, activeFile, files);
      if (!resolved.execution) {
        append("command", `$ ${source}`);
        append("error", resolved.error || (ro ? "Comandă invalidă." : "Invalid command."));
        return;
      }
      await execute(resolved.execution.file, resolved.execution.args, source);
    }

    useImperativeHandle(forwardedRef, () => ({ clear, runActiveFile, stop }));

    useEffect(() => {
      const element = outputRef.current;
      if (element) element.scrollTop = element.scrollHeight;
    }, [entries]);

    useEffect(() => () => abortRef.current?.abort(), []);

    return (
      <div className="flex h-full min-h-0 flex-col bg-zinc-950 text-zinc-100">
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/10 px-2">
          <div className="flex min-w-0 items-center gap-2 text-[11px] text-zinc-400">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span className="truncate">ScripticX sandbox</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon-xs"
              variant="ghost"
              className="text-zinc-400 hover:bg-white/10 hover:text-white"
              onClick={() => setStdinOpen((current) => !current)}
              aria-label={ro ? "Configurează stdin" : "Configure stdin"}
              title="stdin"
            >
              <TextCursorInput size={13} />
            </Button>
            {running ? (
              <Button
                size="icon-xs"
                variant="ghost"
                className="text-zinc-400 hover:bg-white/10 hover:text-white"
                onClick={stop}
                aria-label={ro ? "Oprește procesul" : "Stop process"}
              >
                <CircleStop size={13} />
              </Button>
            ) : (
              <Button
                size="icon-xs"
                variant="ghost"
                className="text-zinc-400 hover:bg-white/10 hover:text-white"
                onClick={() => void runActiveFile()}
                disabled={!activeFile || activeFile.language === "msp" || !isCloudRunnableLanguage(activeFile.language)}
                aria-label={ro ? "Rulează fișierul activ" : "Run active file"}
              >
                <Play size={13} />
              </Button>
            )}
            <Button
              size="icon-xs"
              variant="ghost"
              className="text-zinc-400 hover:bg-white/10 hover:text-white"
              onClick={clear}
              aria-label={ro ? "Curăță terminalul" : "Clear terminal"}
            >
              <Eraser size={13} />
            </Button>
          </div>
        </div>

        <div ref={outputRef} role="log" aria-live="polite" className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-xs leading-5">
          {entries.length === 0 ? (
            <div className="text-zinc-500">
              {ro ? "Terminal de execuție. Folosește «help» pentru lista comenzilor." : "Execution terminal. Use `help` for available commands."}
            </div>
          ) : (
            entries.map((entry) => (
              <pre
                key={entry.id}
                className={cn(
                  "whitespace-pre-wrap break-words font-mono",
                  entry.kind === "command" && "text-zinc-400",
                  entry.kind === "stdout" && "text-zinc-100",
                  entry.kind === "stderr" && "text-amber-300",
                  entry.kind === "error" && "text-red-300",
                  entry.kind === "system" && "text-sky-300"
                )}
              >
                {entry.text.replace(/\n$/, "")}
              </pre>
            ))
          )}
        </div>

        {stdinOpen && (
          <div className="border-t border-white/10 p-2">
            <Textarea
              value={stdin}
              onChange={(event) => setStdin(event.target.value)}
              className="min-h-16 resize-y border-white/10 bg-white/5 font-mono text-xs text-zinc-100 placeholder:text-zinc-600"
              placeholder={ro ? "Intrarea transmisă programului (stdin)" : "Input passed to the program (stdin)"}
              spellCheck={false}
            />
          </div>
        )}

        <div className="flex h-9 shrink-0 items-center gap-1.5 border-t border-white/10 px-3 font-mono text-xs">
          <ChevronRight className="size-3.5 shrink-0 text-emerald-400" />
          <Input
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void submitCommand();
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                const next = Math.min(history.length - 1, historyIndex + 1);
                setHistoryIndex(next);
                setCommand(history[history.length - 1 - next] || "");
              } else if (event.key === "ArrowDown") {
                event.preventDefault();
                const next = Math.max(-1, historyIndex - 1);
                setHistoryIndex(next);
                setCommand(next === -1 ? "" : history[history.length - 1 - next] || "");
              }
            }}
            disabled={running}
            aria-label={ro ? "Comandă terminal" : "Terminal command"}
            placeholder={running ? (ro ? "Proces în execuție" : "Process running") : "run"}
            className="h-7 border-0 bg-transparent px-0 font-mono text-xs text-zinc-100 shadow-none focus-visible:ring-0 dark:bg-transparent"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>
    );
  }
);

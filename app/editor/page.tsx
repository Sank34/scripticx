"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import RouteGuard from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

import { parseLine, step, reset, setVariable, advanceLine } from "@/lib/engine";
import {
  analyzeMiniScriptComplexity,
  type ComplexityAnalysis,
} from "@/lib/complexity-analyzer";
import { visualizeMiniScript } from "@/lib/msp-visualizer";
import { ComplexityAnalyzerCard } from "@/components/editor/ComplexityAnalyzerCard";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { useLanguage } from "@/components/LanguageProvider";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Play,
  Bug,
  StepForward,
  Save,
  Share2,
  FileDown,
  Trash2,
  Pencil,
  Plus,
  Gauge,
  Workflow,
} from "lucide-react";


type SnippetItem = {
  id: string;
  title: string;
  description: string;
  code: string;
  created_at: string;
};

type Value = string | number | boolean;
type ProgramInstruction = ReturnType<typeof parseLine>;

function getErrorDetails(error: unknown) {
  if (error && typeof error === "object") {
    const candidate = error as { message?: unknown; line?: unknown };

    return {
      message:
        typeof candidate.message === "string"
          ? candidate.message
          : "Unknown error",
      line: typeof candidate.line === "number" ? candidate.line : undefined,
    };
  }

  return {
    message: error instanceof Error ? error.message : "Unknown error",
    line: undefined,
  };
}

function EditorContent() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();

  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const [code, setCode] = useState(
    () =>
      searchParams.get("code") ??
      `X = 0
WHILE X < 3
PRINT X
X = X + 1
END`,
  );

  const [program, setProgram] = useState<ProgramInstruction[]>([]);
  const [variables, setVariables] = useState<Record<string, Value>>({});
  const [currentLine, setCurrentLine] = useState(0);
  const [output, setOutput] = useState<string[]>([]);
  const [stopped, setStopped] = useState(false);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [inputVar, setInputVar] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [complexityEnabled, setComplexityEnabled] = useState(false);

  const codeLines = code.split("\n");
  const complexityAnalysis = useMemo<ComplexityAnalysis | null>(() => {
    if (!complexityEnabled) return null;

    return analyzeMiniScriptComplexity(code, locale);
  }, [code, locale, complexityEnabled]);
  const codeVisualization = useMemo(() => visualizeMiniScript(code), [code]);

  async function fetchSnippets(): Promise<SnippetItem[]> {
    if (!user) return [];

    const { data } = await supabase
      .from("snippets")
      .select("id, title, description, code, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return data || [];
  }

  const {
    data: snippets = [],
  } = useQuery<SnippetItem[]>({
    queryKey: ["editor-snippets", user?.id],
    queryFn: fetchSnippets,
    enabled: !!user,
  });

  function compile() {
    const parsed = code.split("\n").map(parseLine);

    setProgram(parsed);
    reset();

    setVariables({});
    setCurrentLine(0);
    setOutput([]);
    setStopped(false);
    setErrorLine(null);
  }

  function handleStep() {
    if (program.length === 0 || stopped) return;

    setIsRunning(false);

    try {
      const result = step(program);

      if (!result) {
        setStopped(true);
        return;
      }

      if (result.inputRequest) {
        setInputVar(result.inputRequest);
        return;
      }

      setVariables(result.variables);
      setCurrentLine(result.currentLine);

      if (result.output !== null) {
        setOutput(prev => [...prev, String(result.output)]);
      }

    } catch (error: unknown) {
      const details = getErrorDetails(error);
      setOutput(prev => [...prev, "ERROR: " + details.message]);
      setErrorLine(details.line ?? currentLine);
      setStopped(true);
    }
  }

  function handleSubmitInput() {
    if (!inputVar) return;

    let value: Value;

    if (inputValue === "true" || inputValue === "false") {
      value = inputValue === "true";
    } else if (!isNaN(Number(inputValue))) {
      value = Number(inputValue);
    } else {
      value = inputValue;
    }

    setVariable(inputVar, value);

    setVariables(prev => ({
      ...prev,
      [inputVar]: value
    }));

    setInputVar(null);
    setInputValue("");

    advanceLine();
    setCurrentLine(prev => prev + 1);

    if (isRunning) runProgram();
  }

  function runProgram() {
    let res;
    const newOutput: string[] = [];

    try {
      while (true) {
        res = step(program);

        if (!res) break;

        if (res.inputRequest) {
          setInputVar(res.inputRequest);
          break;
        }

        if (res.output !== null) {
          newOutput.push(String(res.output));
        }

        setVariables(res.variables);
        setCurrentLine(res.currentLine);
      }
    } catch (error: unknown) {
      const details = getErrorDetails(error);
      newOutput.push("ERROR: " + details.message);
      setErrorLine(details.line ?? currentLine);
      setStopped(true);
    }

    setOutput(prev => [...prev, ...newOutput]);
  }

  function handleRun() {
    if (program.length === 0 || stopped) return;

    setIsRunning(true);
    runProgram();
  }

  function handleSaveFile() {
    try {
      const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "solution.msp";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);

      toast.success(t("editor.toast.savedFile"));
    } catch {
      toast.error(t("editor.toast.saveError"));
    }
  }

  async function saveSnippet(silent = false) {
    if (!user) return;
    if (!code.trim()) {
      if (!silent) toast.error("Code cannot be empty");
      return;
    }
    setSaving(true);

    let data, error;

    if (savedId) {
      const res = await supabase
        .from("snippets")
        .update({
          title,
          description,
          code,
          is_public: true,
        })
        .eq("id", savedId)
        .select()
        .single();

      data = res.data;
      error = res.error;
    } else {
      const res = await supabase
        .from("snippets")
        .insert([
          {
            user_id: user.id,
            title,
            description,
            code,
            is_public: true,
          },
        ])
        .select()
        .single();

      data = res.data;
      error = res.error;
    }

    setSaving(false);

    if (error) {
      toast.error(t("editor.toast.snippetSaveError"));
      return;
    }

    if (!silent) toast.success(t("editor.toast.snippetSaved"));
    await queryClient.invalidateQueries({
      queryKey: ["editor-snippets", user.id],
    });
    setSavedId(data.id);
    return data.id;
  }

  async function handleShare() {
    let idToUse = savedId;

    if (!idToUse) {
      const id = await saveSnippet(true);
      if (!id) return;
      idToUse = id;
    }

    const url = `${window.location.origin}/editor/${idToUse}`;
    await navigator.clipboard.writeText(url);

    toast.success(t("editor.toast.copied"));
  }

  async function deleteSnippet(id: string) {
    const { error } = await supabase
      .from("snippets")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error(t("editor.toast.deleteError"));
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["editor-snippets", user?.id],
    });

    if (savedId === id) {
      setSavedId(null);
    }

    toast.success(t("editor.toast.deleted"));
  }
  function handleAnalyzeComplexity() {
    setComplexityEnabled(true);
    toast.success(t("editor.complexity.toast.completed"));
  }

  async function loadSnippet(id: string) {
  const { data } = await supabase
    .from("snippets")
    .select("*")
    .eq("id", id)
    .single();

  if (data) {
    setCode(data.code);
    setTitle(data.title || "");
    setDescription(data.description || "");
    setSavedId(data.id);
  }
}

  function createNewSnippet() {
    setSavedId(null);
    setTitle("");
    setDescription("");
    setCode("");
  }

  return (
    <PageContainer variant="full">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{t("editor.title")}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 flex flex-col h-full">

            <Input
              placeholder={t("editor.placeholderTitle")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <Textarea
              placeholder={t("editor.placeholderDescription")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="flex-1 flex flex-col gap-2">
              <Textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono flex-1"
              />

              <div className="bg-slate-900 text-white rounded-md p-3 font-mono text-sm overflow-auto max-h-[250px]">
                {codeLines.map((line, index) => (
                  <div
                    key={index}
                    className={`px-2 py-1 rounded
                      ${index === errorLine ? "bg-red-500/50" :
                        index === currentLine ? "bg-blue-500/40" :
                        ""}`}
                  >
                    {index + 1}. {line}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-2">
              <TooltipProvider>
                <div className="flex gap-2 flex-wrap p-2 bg-muted/40 rounded-lg border sticky bottom-0">

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="outline" onClick={createNewSnippet}>
                        <Plus size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("editor.actions.newSnippet")}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="secondary" onClick={compile}>
                        <Bug size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("editor.actions.compile")}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" onClick={handleStep} disabled={stopped}>
                        <StepForward size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("editor.actions.step")}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" onClick={handleRun} disabled={stopped}>
                        <Play size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("editor.actions.run")}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="outline" onClick={handleSaveFile}>
                        <FileDown size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("editor.actions.download")}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" onClick={() => saveSnippet(false)} disabled={saving}>
                        <Save size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {savedId ? t("editor.actions.update") : t("editor.actions.save")}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="secondary" onClick={handleShare}>
                        <Share2 size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t("editor.actions.share")}</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={handleAnalyzeComplexity}
                        aria-label={
                          complexityAnalysis
                            ? t("editor.complexity.actions.rerun")
                            : t("editor.complexity.actions.analyze")
                        }
                      >
                        <Gauge size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {complexityAnalysis
                        ? t("editor.complexity.actions.rerun")
                        : t("editor.complexity.actions.analyze")}
                    </TooltipContent>
                  </Tooltip>

                </div>
              </TooltipProvider>
            </div>

          </CardContent>
        </Card>

        <div className="space-y-6">

          <Card>
            <CardHeader>
              <CardTitle>{t("editor.debugger.title")}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">

              <div>
                <h3 className="font-semibold mb-1">{t("editor.debugger.variables")}</h3>
                <pre className="text-sm bg-muted p-2 rounded whitespace-pre-wrap break-words">
                  {JSON.stringify(variables, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold">{t("editor.debugger.currentLine")}</h3>
                <p>{currentLine}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-1">{t("editor.debugger.output")}</h3>
                <pre className="text-sm bg-muted p-2 rounded max-h-[200px] overflow-y-auto whitespace-pre-wrap break-words">
                  {output.join("\n")}
                </pre>
              </div>

              {inputVar && (
                <div className="space-y-2">
                  <p className="font-medium">
                    {t("editor.debugger.input")} {inputVar}:
                  </p>

                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />

                  <Button onClick={handleSubmitInput}>
                    {t("editor.debugger.submit")}
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>

          <ComplexityAnalyzerCard analysis={complexityAnalysis} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow size={18} />
                {t("editor.visualization.title")}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="ast" className="gap-3">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="ast">
                    {t("editor.visualization.tabs.ast")}
                  </TabsTrigger>
                  <TabsTrigger value="flowchart">
                    {t("editor.visualization.tabs.flowchart")}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="ast">
                  <pre className="max-h-[260px] overflow-auto rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed whitespace-pre-wrap">
                    {codeVisualization.ast}
                  </pre>
                </TabsContent>

                <TabsContent value="flowchart">
                  <pre className="max-h-[260px] overflow-auto rounded-lg border bg-muted/50 p-3 text-xs leading-relaxed whitespace-pre-wrap">
                    {codeVisualization.flowchart}
                  </pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("editor.snippets.title")}</CardTitle>
            </CardHeader>

            <CardContent className="max-h-[300px] overflow-y-auto space-y-2">
              <TooltipProvider>

                {snippets.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("editor.snippets.empty")}
                  </p>
                )}

                {snippets.map((s) => (
                  <div
                    key={s.id}
                    className={`p-2 rounded transition flex items-center justify-between group cursor-pointer ${savedId === s.id ? "bg-muted border border-primary" : "hover:bg-muted"}`}
                  >
                    <div
                      onClick={() => loadSnippet(s.id)}
                      className="cursor-pointer flex-1"
                    >
                      <p className="font-medium text-sm">
                        {s.title || t("editor.snippets.untitled")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => loadSnippet(s.id)}
                          >
                            <Pencil size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("editor.snippets.edit")}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteSnippet(s.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t("editor.snippets.delete")}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}

              </TooltipProvider>
            </CardContent>
          </Card>

        </div>

      </div>
    </PageContainer>
  );
}

export default function EditorPage() {
  return (
    <RouteGuard requireAuth>
      <Suspense fallback={null}>
        <EditorContent />
      </Suspense>
    </RouteGuard>
  );
}

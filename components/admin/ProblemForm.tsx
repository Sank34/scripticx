"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Code2,
  Columns2,
  CopyPlus,
  Eye,
  FileText,
  FlaskConical,
  Loader2,
  Maximize2,
  PencilLine,
  Plus,
  Save,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { Markdown } from "@/components/Markdown";
import { MiniScriptMonacoEditor } from "@/components/editor/MiniScriptMonacoEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type EditorMode = "edit" | "split" | "preview";
type TranslationMap = Record<string, string>;

type ProblemTestCase = {
  input: unknown;
  output: string;
};

type ProblemFormData = {
  code?: number | string | null;
  description_i18n?: TranslationMap | null;
  difficulty?: string | null;
  id?: string;
  starter_code?: string | null;
  test_cases?: unknown;
  title_i18n?: TranslationMap | null;
};

type ProblemFormProps = {
  className?: string;
  fillHeight?: boolean;
  initialData?: ProblemFormData | null;
  onCancel?: () => void;
  onSuccess?: () => void;
};

const languageOptions = [
  { label: "English", value: "en" },
  { label: "Română", value: "ro" },
] as const;

function normalizeTranslations(value: TranslationMap | null | undefined) {
  if (!value || typeof value !== "object") return { en: "" };
  const translations = Object.fromEntries(
    Object.entries(value).filter(([, text]) => typeof text === "string")
  );
  return Object.keys(translations).length ? translations : { en: "" };
}

function normalizeTestCases(value: unknown): ProblemTestCase[] {
  if (!Array.isArray(value) || value.length === 0) return [{ input: [], output: "" }];
  return value.map((item) => {
    if (!item || typeof item !== "object") return { input: [], output: "" };
    const testCase = item as { input?: unknown; output?: unknown };
    return {
      input: testCase.input ?? [],
      output: typeof testCase.output === "string" ? testCase.output : String(testCase.output ?? ""),
    };
  });
}

function serializeInput(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function statementTemplate(language: string) {
  if (language === "ro") {
    return "## Cerință\n\nDescrie clar ce trebuie să rezolve programul.\n\n## Date de intrare\n\nDescrie valorile citite.\n\n## Date de ieșire\n\nDescrie rezultatul așteptat.\n\n## Restricții și precizări\n\n- Adaugă restricțiile relevante.\n\n## Exemplu\n\n```text\nInput\nOutput\n```";
  }
  return "## Task\n\nDescribe clearly what the program must solve.\n\n## Input\n\nDescribe the values read by the program.\n\n## Output\n\nDescribe the expected result.\n\n## Constraints\n\n- Add the relevant constraints.\n\n## Example\n\n```text\nInput\nOutput\n```";
}

function ProblemStatementPreview({
  code,
  description,
  difficulty,
  emptyLabel,
  title,
}: {
  code?: number | string | null;
  description: string;
  difficulty: string;
  emptyLabel: string;
  title: string;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10 lg:py-14">
      <div className="border-b pb-7">
        <div className="flex flex-wrap items-center gap-2">
          {code != null && <span className="font-mono text-xs text-muted-foreground">#{code}</span>}
          <Badge variant="outline" className="capitalize">{difficulty}</Badge>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {title.trim() || emptyLabel}
        </h1>
      </div>
      <div className="pt-7">
        {description.trim() ? (
          <Markdown className="text-[15px] leading-7 sm:text-base sm:leading-8">
            {description}
          </Markdown>
        ) : (
          <div className="grid min-h-56 place-items-center border border-dashed text-center text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        )}
      </div>
    </article>
  );
}

function ModeControl({
  mode,
  onChange,
  labels,
}: {
  labels: Record<EditorMode, string>;
  mode: EditorMode;
  onChange: (mode: EditorMode) => void;
}) {
  const items = [
    ["edit", PencilLine],
    ["split", Columns2],
    ["preview", Eye],
  ] as const;

  return (
    <div className="inline-flex items-center rounded-[var(--sx-radius-control)] border bg-muted/35 p-0.5">
      {items.map(([value, Icon]) => (
        <Button
          key={value}
          type="button"
          variant={mode === value ? "secondary" : "ghost"}
          size="sm"
          className="h-7 px-2.5 text-xs"
          onClick={() => onChange(value)}
          aria-pressed={mode === value}
          aria-label={labels[value]}
        >
          <Icon className="size-3.5" />
          <span className="hidden sm:inline">{labels[value]}</span>
        </Button>
      ))}
    </div>
  );
}

export function ProblemForm({
  className,
  fillHeight = false,
  initialData,
  onCancel,
  onSuccess,
}: ProblemFormProps) {
  const { locale, t } = useLanguage();
  const ro = locale === "ro";
  const copy = ro
    ? {
        configuration: "Configurare problemă",
        configurationDescription: "Editează enunțul, codul inițial, opțiunile și evaluarea.",
        content: "Enunț",
        contentDescription: "Scrie în Markdown și verifică rezultatul înainte de publicare.",
        edit: "Editează",
        split: "Împarte",
        preview: "Preview",
        openStudio: "Deschide editorul complet",
        closeStudio: "Ieși din modul complet",
        studioTitle: "Editorul enunțului",
        studioDescription: "Editează și verifică enunțul în contextul paginii publice.",
        options: "Opțiuni",
        problemSettings: "Setările problemei",
        translation: "Traducere",
        translations: "Traduceri",
        translationDescription: "Fiecare limbă păstrează propriul titlu și enunț.",
        removeTranslation: "Elimină traducerea",
        insertTemplate: "Inserează structura",
        emptyPreview: "Adaugă un titlu și un enunț pentru a construi preview-ul.",
        starterDescription: "Codul încărcat când utilizatorul deschide problema.",
        testsDescription: "Cazurile sunt evaluate în ordinea afișată.",
        test: "Test",
        duplicateTest: "Duplică testul",
        removeTest: "Elimină testul",
        input: "Input",
        output: "Output așteptat",
        save: initialData?.id ? "Salvează modificările" : "Creează problema",
        ready: "Gata de salvat",
        incomplete: "Necesită conținut",
        completeness: "Verificare configurare",
        titleReady: "Titlu completat",
        statementReady: "Enunț completat",
        testsReady: "Cel puțin un test",
        characters: "caractere",
        testCount: "cazuri de test",
        cancel: "Anulează",
        addTranslation: "Adaugă traducere",
      }
    : {
        configuration: "Problem configuration",
        configurationDescription: "Edit the statement, starter code, options, and evaluation.",
        content: "Statement",
        contentDescription: "Write in Markdown and verify the result before publishing.",
        edit: "Edit",
        split: "Split",
        preview: "Preview",
        openStudio: "Open full editor",
        closeStudio: "Exit full screen",
        studioTitle: "Statement editor",
        studioDescription: "Edit and verify the statement in the public-page context.",
        options: "Options",
        problemSettings: "Problem settings",
        translation: "Translation",
        translations: "Translations",
        translationDescription: "Each language keeps its own title and statement.",
        removeTranslation: "Remove translation",
        insertTemplate: "Insert structure",
        emptyPreview: "Add a title and statement to build the preview.",
        starterDescription: "The code loaded when a learner opens the problem.",
        testsDescription: "Test cases are evaluated in the displayed order.",
        test: "Test",
        duplicateTest: "Duplicate test",
        removeTest: "Remove test",
        input: "Input",
        output: "Expected output",
        save: initialData?.id ? "Save changes" : "Create problem",
        ready: "Ready to save",
        incomplete: "Needs content",
        completeness: "Configuration check",
        titleReady: "Title completed",
        statementReady: "Statement completed",
        testsReady: "At least one test case",
        characters: "characters",
        testCount: "test cases",
        cancel: "Cancel",
        addTranslation: "Add translation",
      };

  const initialTitles = useMemo(
    () => normalizeTranslations(initialData?.title_i18n),
    [initialData?.title_i18n]
  );
  const initialDescriptions = useMemo(
    () => normalizeTranslations(initialData?.description_i18n),
    [initialData?.description_i18n]
  );
  const initialLanguages = useMemo(
    () => Array.from(new Set([...Object.keys(initialTitles), ...Object.keys(initialDescriptions)])),
    [initialDescriptions, initialTitles]
  );

  const [languages, setLanguages] = useState<string[]>(initialLanguages.length ? initialLanguages : ["en"]);
  const [activeLang, setActiveLang] = useState(initialLanguages[0] || "en");
  const [titleI18n, setTitleI18n] = useState<TranslationMap>(initialTitles);
  const [descriptionI18n, setDescriptionI18n] = useState<TranslationMap>(initialDescriptions);
  const [starterCode, setStarterCode] = useState(initialData?.starter_code || "");
  const [difficulty, setDifficulty] = useState(initialData?.difficulty || "easy");
  const [testCases, setTestCases] = useState<ProblemTestCase[]>(() => normalizeTestCases(initialData?.test_cases));
  const [loading, setLoading] = useState(false);
  const [inlineMode, setInlineMode] = useState<EditorMode>("split");
  const [studioMode, setStudioMode] = useState<EditorMode>("split");
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioOptionsOpen, setStudioOptionsOpen] = useState(true);

  const title = titleI18n[activeLang] || "";
  const description = descriptionI18n[activeLang] || "";
  const hasTitle = Object.values(titleI18n).some((value) => value.trim());
  const hasDescription = Object.values(descriptionI18n).some((value) => value.trim());
  const canSave = hasTitle && hasDescription && testCases.length > 0 && !loading;
  const modes = { edit: copy.edit, split: copy.split, preview: copy.preview };

  function updateTitle(value: string) {
    setTitleI18n((current) => ({ ...current, [activeLang]: value }));
  }

  function updateDescription(value: string) {
    setDescriptionI18n((current) => ({ ...current, [activeLang]: value }));
  }

  function addLanguage(language: string) {
    if (languages.includes(language)) {
      setActiveLang(language);
      return;
    }
    setLanguages((current) => [...current, language]);
    setTitleI18n((current) => ({ ...current, [language]: "" }));
    setDescriptionI18n((current) => ({ ...current, [language]: "" }));
    setActiveLang(language);
  }

  function removeLanguage(language: string) {
    if (languages.length === 1) return;
    const nextLanguages = languages.filter((item) => item !== language);
    setLanguages(nextLanguages);
    setTitleI18n((current) => {
      const next = { ...current };
      delete next[language];
      return next;
    });
    setDescriptionI18n((current) => {
      const next = { ...current };
      delete next[language];
      return next;
    });
    if (activeLang === language) setActiveLang(nextLanguages[0]);
  }

  function updateTestCase(index: number, patch: Partial<ProblemTestCase>) {
    setTestCases((current) => current.map((test, testIndex) => testIndex === index ? { ...test, ...patch } : test));
  }

  function updateInput(index: number, value: string) {
    try {
      updateTestCase(index, { input: JSON.parse(value) });
    } catch {
      updateTestCase(index, { input: value });
    }
  }

  function duplicateTestCase(index: number) {
    setTestCases((current) => {
      const source = current[index];
      const duplicate = { input: source.input, output: source.output };
      return [...current.slice(0, index + 1), duplicate, ...current.slice(index + 1)];
    });
  }

  async function handleSubmit() {
    if (!hasTitle || !hasDescription) {
      toast.error(t("admin.problems.form.validation.required"));
      return;
    }

    setLoading(true);
    const payload = {
      title_i18n: titleI18n,
      description_i18n: descriptionI18n,
      starter_code: starterCode,
      difficulty,
      test_cases: testCases,
    };
    try {
      const result = initialData?.id
        ? await supabase.from("problems").update(payload).eq("id", initialData.id)
        : await supabase.from("problems").insert([payload]);
      if (result.error) throw result.error;
    } catch {
      toast.error(t("admin.problems.form.toast.saveError"));
      return;
    } finally {
      setLoading(false);
    }

    toast.success(
      initialData?.id
        ? t("admin.problems.form.toast.updated")
        : t("admin.problems.form.toast.created")
    );
    onSuccess?.();
  }

  function editorSurface(mode: EditorMode, fullScreen = false) {
    const editor = mode !== "preview" && (
      <div className="h-full min-h-0 overflow-hidden bg-zinc-950">
        <MiniScriptMonacoEditor
          value={description}
          onChange={updateDescription}
          language="markdown"
          path={`problem-statement-${activeLang}.md`}
          theme="dark"
          height="100%"
          options={{
            automaticLayout: true,
            folding: true,
            glyphMargin: false,
            lineDecorationsWidth: 10,
            lineNumbers: "on",
            lineNumbersMinChars: 3,
            minimap: { enabled: false },
            padding: fullScreen
              ? { top: 28, bottom: 32 }
              : { top: 18, bottom: 22 },
            quickSuggestions: false,
            renderWhitespace: "selection",
            scrollBeyondLastLine: false,
            wordWrap: "on",
            wrappingIndent: "same",
          }}
        />
      </div>
    );
    const preview = mode !== "edit" && (
      <div className="note-scrollbar h-full min-h-0 overflow-y-auto bg-background">
        <ProblemStatementPreview
          code={initialData?.code}
          description={description}
          difficulty={difficulty}
          emptyLabel={copy.emptyPreview}
          title={title}
        />
      </div>
    );

    if (mode === "split") {
      return (
        <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-2">
          <div className="min-h-0 border-b md:border-r md:border-b-0">{editor}</div>
          <div className="min-h-0">{preview}</div>
        </div>
      );
    }
    return <div className="h-full min-h-0">{editor || preview}</div>;
  }

  const settingsContent = (
    <div className="space-y-6">
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold">{copy.translations}</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.translationDescription}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {languages.map((language) => {
            const completed = Boolean(titleI18n[language]?.trim() && descriptionI18n[language]?.trim());
            return (
              <Button
                key={language}
                type="button"
                size="sm"
                variant={activeLang === language ? "secondary" : "outline"}
                className="justify-between"
                onClick={() => setActiveLang(language)}
              >
                {language.toUpperCase()}
                {completed && <CheckCircle2 className="size-3.5 text-[var(--sx-success)]" />}
              </Button>
            );
          })}
        </div>
        <Select onValueChange={addLanguage}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={copy.addTranslation} />
          </SelectTrigger>
          <SelectContent>
            {languageOptions.map((language) => (
              <SelectItem key={language.value} value={language.value}>{language.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {languages.length > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={() => removeLanguage(activeLang)}
          >
            <Trash2 className="size-3.5" />
            {copy.removeTranslation} {activeLang.toUpperCase()}
          </Button>
        )}
      </section>

      <Separator />

      <section className="space-y-3">
        <label className="space-y-2 text-sm font-medium">
          {t("admin.problems.form.difficulty")}
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("admin.problems.form.selectDifficulty")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">{copy.completeness}</h3>
        {[
          [copy.titleReady, hasTitle],
          [copy.statementReady, hasDescription],
          [copy.testsReady, testCases.length > 0],
        ].map(([label, complete]) => (
          <div key={String(label)} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <CheckCircle2 className={cn("size-4", complete ? "text-[var(--sx-success)]" : "text-muted-foreground/35")} />
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{description.length} {copy.characters}</span>
          <span>{testCases.length} {copy.testCount}</span>
        </div>
      </section>
    </div>
  );

  return (
    <TooltipProvider delayDuration={180}>
      <div
        className={cn(
          fillHeight
            ? "flex h-full min-h-0 flex-col overflow-hidden"
            : "space-y-6",
          className
        )}
      >
        <div className={cn(
          "flex shrink-0 flex-col gap-3 border-b pb-5 sm:flex-row sm:items-center sm:justify-between",
          fillHeight && "mb-5"
        )}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{copy.configuration}</h2>
              <Badge variant="outline">
                {loading
                  ? t("admin.problems.form.submit.saving")
                  : canSave
                    ? copy.ready
                    : copy.incomplete}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{copy.configurationDescription}</p>
          </div>
          <div className="flex gap-2 xl:hidden">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>{copy.cancel}</Button>
            )}
            <Button type="button" disabled={!canSave} onClick={() => void handleSubmit()}>
              {loading ? <Loader2 className="animate-spin" /> : <Save />}
              {copy.save}
            </Button>
          </div>
        </div>

        <div className={cn(
          "grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]",
          fillHeight
            ? "min-h-0 flex-1 overflow-y-auto xl:overflow-hidden"
            : "items-start"
        )}>
          <div className={cn(
            "min-w-0 space-y-6",
            fillHeight && "note-scrollbar xl:min-h-0 xl:overflow-y-auto xl:px-2 xl:pt-1 xl:pb-6 xl:[scrollbar-gutter:stable]"
          )}>
            <section className="sx-surface overflow-hidden">
              <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-muted-foreground" />
                    <h3 className="font-semibold">{copy.content}</h3>
                    <Badge variant="secondary">{activeLang.toUpperCase()}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{copy.contentDescription}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ModeControl labels={modes} mode={inlineMode} onChange={setInlineMode} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        onClick={() => {
                          setStudioMode("split");
                          setStudioOpen(true);
                        }}
                        aria-label={copy.openStudio}
                      >
                        <Maximize2 />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{copy.openStudio}</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              <div className="space-y-3 border-b p-4">
                <label className="space-y-2 text-sm font-medium">
                  {t("admin.problems.form.title")} · {activeLang.toUpperCase()}
                  <Input value={title} onChange={(event) => updateTitle(event.target.value)} />
                </label>
                {!description.trim() && (
                  <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={() => updateDescription(statementTemplate(activeLang))}>
                    <Plus className="size-3.5" />
                    {copy.insertTemplate}
                  </Button>
                )}
              </div>
              <div className="h-[430px] min-h-0">{editorSurface(inlineMode)}</div>
              <div className="flex items-center justify-between border-t bg-muted/35 px-4 py-2 text-xs text-muted-foreground">
                <span>{description.length} {copy.characters}</span>
                <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => setStudioOpen(true)}>
                  <Maximize2 className="size-3.5" />
                  {copy.openStudio}
                </Button>
              </div>
            </section>

            <section className="sx-surface overflow-hidden">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Code2 className="size-4 text-muted-foreground" />
                    <h3 className="font-semibold">{t("admin.problems.form.starterCode")}</h3>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{copy.starterDescription}</p>
                </div>
                <Badge variant="outline">MS+</Badge>
              </div>
              <MiniScriptMonacoEditor
                height="300px"
                language="msp"
                path="starter.msp"
                value={starterCode}
                onChange={setStarterCode}
                options={{
                  automaticLayout: true,
                  bracketPairColorization: { enabled: true },
                  folding: true,
                  glyphMargin: false,
                  guides: { bracketPairs: true, indentation: true },
                  lineDecorationsWidth: 8,
                  lineNumbers: "on",
                  lineNumbersMinChars: 3,
                  minimap: { enabled: false },
                  padding: { top: 14, bottom: 18 },
                  quickSuggestions: { other: true, comments: false, strings: false },
                  snippetSuggestions: "top",
                  suggestOnTriggerCharacters: true,
                  wordWrap: "on",
                }}
              />
            </section>

            <section className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <FlaskConical className="size-4 text-muted-foreground" />
                    <h3 className="font-semibold">{t("admin.problems.form.testCases")}</h3>
                    <Badge variant="secondary">{testCases.length}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{copy.testsDescription}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setTestCases((current) => [...current, { input: [], output: "" }])}>
                  <Plus />
                  {t("admin.problems.form.addTestCase")}
                </Button>
              </div>

              <div className="space-y-3">
                {testCases.map((test, index) => (
                  <Card key={index} size="sm" className="gap-0 py-0">
                    <CardHeader className="border-b py-3">
                      <CardTitle className="flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-md bg-muted font-mono text-[11px] text-muted-foreground">{index + 1}</span>
                        {copy.test} {index + 1}
                      </CardTitle>
                      <CardAction className="flex items-center gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button type="button" size="icon-sm" variant="ghost" onClick={() => duplicateTestCase(index)} aria-label={copy.duplicateTest}>
                              <CopyPlus />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{copy.duplicateTest}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              disabled={testCases.length === 1}
                              onClick={() => setTestCases((current) => current.filter((_, testIndex) => testIndex !== index))}
                              aria-label={copy.removeTest}
                            >
                              <Trash2 />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{copy.removeTest}</TooltipContent>
                        </Tooltip>
                      </CardAction>
                    </CardHeader>
                    <CardContent className="grid gap-3 py-4 md:grid-cols-2">
                      <label className="space-y-2 text-xs font-medium text-muted-foreground">
                        {copy.input}
                        <Textarea
                          value={serializeInput(test.input)}
                          onChange={(event) => updateInput(index, event.target.value)}
                          className="field-sizing-fixed min-h-28 resize-y font-mono text-xs text-foreground"
                          placeholder={t("admin.problems.form.inputPlaceholder")}
                        />
                      </label>
                      <label className="space-y-2 text-xs font-medium text-muted-foreground">
                        {copy.output}
                        <Textarea
                          value={test.output}
                          onChange={(event) => updateTestCase(index, { output: event.target.value })}
                          className="field-sizing-fixed min-h-28 resize-y font-mono text-xs text-foreground"
                          placeholder={t("admin.problems.form.expectedOutput")}
                        />
                      </label>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          <aside className={cn(
            fillHeight
              ? "note-scrollbar xl:min-h-0 xl:overflow-y-auto xl:px-2 xl:pt-1 xl:pb-6 xl:[scrollbar-gutter:stable]"
              : "xl:sticky xl:top-4"
          )}>
            <Card className="gap-0 py-0">
              <CardHeader className="border-b py-4">
                <CardTitle>{copy.problemSettings}</CardTitle>
                <CardDescription>{copy.configurationDescription}</CardDescription>
              </CardHeader>
              <CardContent className="py-5">{settingsContent}</CardContent>
              <div className="space-y-2 border-t bg-muted/35 p-4">
                <Button type="button" className="w-full" disabled={!canSave} onClick={() => void handleSubmit()}>
                  {loading ? <Loader2 className="animate-spin" /> : <Save />}
                  {copy.save}
                </Button>
                {onCancel && (
                  <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>{copy.cancel}</Button>
                )}
              </div>
            </Card>
          </aside>
        </div>

        <Dialog open={studioOpen} onOpenChange={setStudioOpen}>
          <DialogContent
            showCloseButton={false}
            className="inset-0 top-0 left-0 z-[160] flex h-dvh w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 p-0 ring-0 sm:h-dvh sm:w-screen sm:max-w-none"
          >
            <DialogHeader className="sr-only">
              <DialogTitle>{copy.studioTitle}</DialogTitle>
              <DialogDescription>{copy.studioDescription}</DialogDescription>
            </DialogHeader>
            <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b px-3 sm:px-4">
              <div className="flex min-w-0 items-center gap-2">
                <Button type="button" variant="outline" size="icon-sm" onClick={() => setStudioOpen(false)} aria-label={copy.closeStudio}>
                  <X />
                </Button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{title.trim() || copy.studioTitle}</p>
                  <p className="hidden truncate text-[11px] text-muted-foreground sm:block">{copy.studioDescription}</p>
                </div>
                <Badge variant="secondary" className="hidden sm:inline-flex">{activeLang.toUpperCase()}</Badge>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <ModeControl labels={modes} mode={studioMode} onChange={setStudioMode} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={studioOptionsOpen ? "secondary" : "outline"}
                      size="icon-sm"
                      onClick={() => setStudioOptionsOpen((current) => !current)}
                      aria-label={copy.options}
                    >
                      <Settings2 />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{copy.options}</TooltipContent>
                </Tooltip>
                <Button type="button" size="sm" disabled={!canSave} onClick={() => void handleSubmit()}>
                  {loading ? <Loader2 className="animate-spin" /> : <Save />}
                  <span className="hidden sm:inline">{copy.save}</span>
                </Button>
              </div>
            </header>

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
              <main className="min-w-0 flex-1 overflow-hidden">{editorSurface(studioMode, true)}</main>
              {studioOptionsOpen && (
                <aside className="note-scrollbar sx-elevated absolute inset-y-0 right-0 z-20 w-72 shrink-0 overflow-y-auto border-l bg-background p-5 lg:static lg:shadow-none">
                  <div className="mb-5 flex items-center gap-2">
                    <Settings2 className="size-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">{copy.options}</h2>
                  </div>
                  <div className="space-y-5">
                    <label className="space-y-2 text-sm font-medium">
                      {copy.translation}
                      <Select value={activeLang} onValueChange={setActiveLang}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {languages.map((language) => <SelectItem key={language} value={language}>{language.toUpperCase()}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </label>
                    <label className="space-y-2 text-sm font-medium">
                      {t("admin.problems.form.title")}
                      <Input value={title} onChange={(event) => updateTitle(event.target.value)} />
                    </label>
                    <label className="space-y-2 text-sm font-medium">
                      {t("admin.problems.form.difficulty")}
                      <Select value={difficulty} onValueChange={setDifficulty}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <Separator />
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex justify-between gap-3"><span>{copy.characters}</span><span>{description.length}</span></div>
                      <div className="flex justify-between gap-3"><span>{copy.testCount}</span><span>{testCases.length}</span></div>
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

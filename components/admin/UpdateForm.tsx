"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Columns2,
  Eye,
  FileText,
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
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import type { LocalizedString, UpdateEntry, UpdateTag } from "@/lib/updates";

type EditorMode = "edit" | "split" | "preview";

type UpdateFormProps = {
  fillHeight?: boolean;
  initialData?: UpdateEntry | null;
  onCancel?: () => void;
  onSaved: () => void;
};

const languageOptions = [
  { label: "English", value: "en" },
  { label: "Română", value: "ro" },
] as const;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeTranslations(value: LocalizedString | null | undefined) {
  if (!value || typeof value !== "object") return { en: "" };
  const translations = Object.fromEntries(
    Object.entries(value).filter(([, text]) => typeof text === "string")
  );
  return Object.keys(translations).length ? translations : { en: "" };
}

function updateTemplate(language: string) {
  if (language === "ro") {
    return "## Ce este nou\n\nPrezintă schimbarea și beneficiul pentru utilizatori.\n\n## Îmbunătățiri\n\n- Descrie îmbunătățirea principală.\n- Adaugă detaliile relevante.\n\n## Remedieri\n\n- Menționează problemele rezolvate.\n";
  }
  return "## What's new\n\nIntroduce the change and its benefit for users.\n\n## Improvements\n\n- Describe the primary improvement.\n- Add the relevant details.\n\n## Fixes\n\n- List the resolved issues.\n";
}

function parseDateKey(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function formatDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function UpdatePreview({
  content,
  date,
  emptyLabel,
  tag,
  tagLabel,
  title,
}: {
  content: string;
  date: string;
  emptyLabel: string;
  tag: UpdateTag | null;
  tagLabel: string;
  title: string;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-10 lg:py-14">
      <div className="border-b pb-7">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {tag && <Badge variant="outline">{tagLabel}</Badge>}
          <span>{date}</span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          {title.trim() || emptyLabel}
        </h1>
      </div>
      <div className="pt-7">
        {content.trim() ? (
          <Markdown className="text-[15px] leading-7 sm:text-base sm:leading-8">
            {content}
          </Markdown>
        ) : (
          <div className="grid min-h-56 place-items-center border border-dashed px-6 text-center text-sm text-muted-foreground">
            {emptyLabel}
          </div>
        )}
      </div>
    </article>
  );
}

function ModeControl({
  labels,
  mode,
  onChange,
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
          aria-label={labels[value]}
          aria-pressed={mode === value}
        >
          <Icon className="size-3.5" />
          <span className="hidden sm:inline">{labels[value]}</span>
        </Button>
      ))}
    </div>
  );
}

export function UpdateForm({
  fillHeight = false,
  initialData,
  onCancel,
  onSaved,
}: UpdateFormProps) {
  const { locale, t } = useLanguage();
  const ro = locale === "ro";
  const copy = ro
    ? {
        addTranslation: "Adaugă traducere",
        characters: "caractere",
        closeStudio: "Închide editorul fullscreen",
        configuration: "Configurare noutate",
        configurationDescription: "Configurează publicarea, traducerile și adresa articolului.",
        contentDescription: "Scrie conținutul în Markdown și verifică rezultatul înainte de publicare.",
        edit: "Editează",
        emptyPreview: "Adaugă un titlu și conținut pentru a construi preview-ul.",
        incomplete: "Incomplet",
        insertTemplate: "Inserează structură",
        openStudio: "Deschide editorul complet",
        options: "Opțiuni",
        preview: "Preview",
        publication: "Publicare",
        ready: "Pregătit",
        removeTranslation: "Elimină traducerea",
        save: initialData?.id ? "Salvează modificările" : "Publică noutatea",
        saving: "Se salvează…",
        split: "Împarte",
        studioDescription: "Editează și verifică articolul în contextul paginii publice.",
        studioTitle: "Editor noutate",
        translationDescription: "Fiecare limbă păstrează propriul titlu și conținut.",
        translations: "Traduceri",
        words: "cuvinte",
      }
    : {
        addTranslation: "Add translation",
        characters: "characters",
        closeStudio: "Exit full-screen editor",
        configuration: "Update configuration",
        configurationDescription: "Configure publishing, translations, and the article URL.",
        contentDescription: "Write in Markdown and verify the result before publishing.",
        edit: "Edit",
        emptyPreview: "Add a title and content to build the preview.",
        incomplete: "Incomplete",
        insertTemplate: "Insert structure",
        openStudio: "Open full editor",
        options: "Options",
        preview: "Preview",
        publication: "Publishing",
        ready: "Ready",
        removeTranslation: "Remove translation",
        save: initialData?.id ? "Save changes" : "Publish update",
        saving: "Saving…",
        split: "Split",
        studioDescription: "Edit and verify the article in its public-page context.",
        studioTitle: "Update editor",
        translationDescription: "Each language keeps its own title and content.",
        translations: "Translations",
        words: "words",
      };

  const normalizedTitles = useMemo(
    () => normalizeTranslations(initialData?.title_i18n),
    [initialData?.title_i18n]
  );
  const normalizedContent = useMemo(
    () => normalizeTranslations(initialData?.content_i18n),
    [initialData?.content_i18n]
  );
  const initialLanguages = useMemo(
    () => Array.from(new Set([...Object.keys(normalizedTitles), ...Object.keys(normalizedContent)])),
    [normalizedContent, normalizedTitles]
  );

  const [languages, setLanguages] = useState<string[]>(initialLanguages.length ? initialLanguages : ["en"]);
  const [activeLang, setActiveLang] = useState(
    initialLanguages.includes(locale) ? locale : initialLanguages[0] || "en"
  );
  const [titleI18n, setTitleI18n] = useState<LocalizedString>(normalizedTitles);
  const [contentI18n, setContentI18n] = useState<LocalizedString>(normalizedContent);
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initialData?.id));
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().slice(0, 10));
  const [tag, setTag] = useState<UpdateTag | "">(initialData?.tag || "");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [inlineMode, setInlineMode] = useState<EditorMode>("split");
  const [studioMode, setStudioMode] = useState<EditorMode>("split");
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioOptionsOpen, setStudioOptionsOpen] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const selectedPublicationDate = parseDateKey(date);
  const title = titleI18n[activeLang] || "";
  const content = contentI18n[activeLang] || "";
  const hasTitle = Object.values(titleI18n).some((value) => value.trim());
  const hasContent = Object.values(contentI18n).some((value) => value.trim());
  const canSave = hasTitle && hasContent && Boolean(slug.trim()) && Boolean(date);
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const modes = { edit: copy.edit, split: copy.split, preview: copy.preview };
  const tagLabel = tag ? t(`admin.updates.form.tags.${tag}`) : "";

  function updateTitle(value: string) {
    setTitleI18n((current) => ({ ...current, [activeLang]: value }));
    if (!slugTouched && (activeLang === "en" || !slug)) setSlug(slugify(value));
  }

  function updateContent(value: string) {
    setContentI18n((current) => ({ ...current, [activeLang]: value }));
  }

  function addLanguage(language: string) {
    if (languages.includes(language)) {
      setActiveLang(language);
      return;
    }
    setLanguages((current) => [...current, language]);
    setTitleI18n((current) => ({ ...current, [language]: "" }));
    setContentI18n((current) => ({ ...current, [language]: "" }));
    setActiveLang(language);
  }

  function removeLanguage(language: string) {
    if (languages.length === 1) return;
    const nextLanguages = languages.filter((candidate) => candidate !== language);
    setLanguages(nextLanguages);
    setTitleI18n((current) => {
      const next = { ...current };
      delete next[language];
      return next;
    });
    setContentI18n((current) => {
      const next = { ...current };
      delete next[language];
      return next;
    });
    setActiveLang(nextLanguages[0]);
  }

  async function handleSubmit() {
    if (!canSave) {
      toast.error(t("admin.updates.form.validation.required"));
      return;
    }

    setSubmitting(true);
    const payload = {
      content_i18n: contentI18n,
      date,
      slug: slug.trim(),
      tag: tag || null,
      title_i18n: titleI18n,
    };
    const { error } = initialData?.id
      ? await supabase.from("updates").update(payload).eq("id", initialData.id)
      : await supabase.from("updates").insert(payload);
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(
      initialData?.id ? t("admin.updates.toast.saved") : t("admin.updates.toast.published")
    );
    onSaved();
  }

  function editorSurface(mode: EditorMode, fullScreen = false) {
    const editor = mode !== "preview" && (
      <div className="h-full min-h-0 overflow-hidden bg-zinc-950">
        <MiniScriptMonacoEditor
          value={content}
          onChange={updateContent}
          language="markdown"
          path={`update-${activeLang}.md`}
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
            padding: fullScreen ? { top: 28, bottom: 32 } : { top: 18, bottom: 22 },
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
        <UpdatePreview
          content={content}
          date={date}
          emptyLabel={copy.emptyPreview}
          tag={tag || null}
          tagLabel={tagLabel}
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
            const completed = Boolean(titleI18n[language]?.trim() && contentI18n[language]?.trim());
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
        {languages.length < languageOptions.length && (
          <Select onValueChange={addLanguage}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={copy.addTranslation} />
            </SelectTrigger>
            <SelectContent>
              {languageOptions
                .filter((language) => !languages.includes(language.value))
                .map((language) => (
                  <SelectItem key={language.value} value={language.value}>{language.label}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        )}
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

      <section className="space-y-4">
        <h3 className="text-sm font-semibold">{copy.publication}</h3>
        <label className="space-y-2 text-sm font-medium">
          {t("admin.updates.form.slug")}
          <Input
            value={slug}
            onChange={(event) => {
              setSlug(event.target.value);
              setSlugTouched(true);
            }}
            placeholder="release-2026-08-25"
          />
        </label>
        <label className="space-y-2 text-sm font-medium">
          {t("admin.updates.form.date")}
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="w-full justify-start font-normal">
                <CalendarDays className="text-muted-foreground" />
                {selectedPublicationDate
                  ? new Intl.DateTimeFormat(ro ? "ro-RO" : "en-US", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }).format(selectedPublicationDate)
                  : t("admin.updates.form.pickDate")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedPublicationDate}
                onSelect={(selectedDate) => {
                  if (!selectedDate) return;
                  setDate(formatDateKey(selectedDate));
                  setCalendarOpen(false);
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </label>
        <label className="space-y-2 text-sm font-medium">
          {t("admin.updates.form.tag")}
          <Select value={tag || "none"} onValueChange={(value) => setTag(value === "none" ? "" : value as UpdateTag)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("admin.updates.form.tags.none")}</SelectItem>
              <SelectItem value="new">{t("admin.updates.form.tags.new")}</SelectItem>
              <SelectItem value="fix">{t("admin.updates.form.tags.fix")}</SelectItem>
              <SelectItem value="improved">{t("admin.updates.form.tags.improved")}</SelectItem>
            </SelectContent>
          </Select>
        </label>
      </section>

      <Separator />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">{ro ? "Verificare" : "Configuration check"}</h3>
        {[
          [t("admin.updates.form.title"), hasTitle],
          [t("admin.updates.form.content"), hasContent],
          [t("admin.updates.form.slug"), Boolean(slug.trim())],
          [t("admin.updates.form.date"), Boolean(date)],
        ].map(([label, complete]) => (
          <div key={String(label)} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{label}</span>
            <CheckCircle2 className={cn("size-4", complete ? "text-[var(--sx-success)]" : "text-muted-foreground/35")} />
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>{content.length} {copy.characters}</span>
          <span>{wordCount} {copy.words}</span>
        </div>
      </section>
    </div>
  );

  return (
    <TooltipProvider delayDuration={180}>
      <div className={cn(fillHeight ? "flex h-full min-h-0 flex-col overflow-hidden" : "space-y-6")}>
        <header className="sticky top-0 z-30 flex shrink-0 flex-col gap-3 border-b bg-popover px-5 py-4 pr-14 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{copy.configuration}</h2>
              <Badge variant="outline">{canSave ? copy.ready : copy.incomplete}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{copy.configurationDescription}</p>
          </div>
          <div className="flex items-center gap-2">
            {onCancel && <Button type="button" variant="outline" onClick={onCancel}>{ro ? "Anulează" : "Cancel"}</Button>}
            <Button type="button" disabled={!canSave || submitting} onClick={() => void handleSubmit()}>
              {submitting ? <Loader2 className="animate-spin" /> : <Save />}
              {submitting ? copy.saving : copy.save}
            </Button>
          </div>
        </header>

        <div className={cn(
          "grid gap-6 p-5 xl:grid-cols-[minmax(0,1fr)_300px]",
          fillHeight ? "min-h-0 flex-1 overflow-y-auto xl:overflow-hidden" : "items-start"
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
                    <h3 className="font-semibold">{t("admin.updates.form.content")}</h3>
                    <Badge variant="secondary">{activeLang.toUpperCase()}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{copy.contentDescription}</p>
                </div>
                <div className="flex items-center gap-2">
                  <ModeControl labels={modes} mode={inlineMode} onChange={setInlineMode} />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="outline" size="icon-sm" onClick={() => setStudioOpen(true)} aria-label={copy.openStudio}>
                        <Maximize2 />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{copy.openStudio}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <div className="space-y-3 border-b p-4">
                <label className="space-y-2 text-sm font-medium">
                  {t("admin.updates.form.title")} · {activeLang.toUpperCase()}
                  <Input value={title} onChange={(event) => updateTitle(event.target.value)} placeholder={t("admin.updates.form.titlePlaceholder")} />
                </label>
                {!content.trim() && (
                  <Button type="button" variant="ghost" size="sm" className="-ml-2" onClick={() => updateContent(updateTemplate(activeLang))}>
                    <Plus className="size-3.5" />
                    {copy.insertTemplate}
                  </Button>
                )}
              </div>
              <div className="h-[500px] min-h-0">{editorSurface(inlineMode)}</div>
              <div className="flex items-center justify-between border-t bg-muted/35 px-4 py-2 text-xs text-muted-foreground">
                <span>{content.length} {copy.characters} · {wordCount} {copy.words}</span>
                <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => setStudioOpen(true)}>
                  <Maximize2 className="size-3.5" />
                  {copy.openStudio}
                </Button>
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
                <CardTitle>{copy.options}</CardTitle>
                <CardDescription>{copy.configurationDescription}</CardDescription>
              </CardHeader>
              <CardContent className="py-5">{settingsContent}</CardContent>
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
                    <Button type="button" variant={studioOptionsOpen ? "secondary" : "outline"} size="icon-sm" onClick={() => setStudioOptionsOpen((current) => !current)} aria-label={copy.options}>
                      <Settings2 />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{copy.options}</TooltipContent>
                </Tooltip>
                <Button type="button" size="sm" disabled={!canSave || submitting} onClick={() => void handleSubmit()}>
                  {submitting ? <Loader2 className="animate-spin" /> : <Save />}
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
                  {settingsContent}
                </aside>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

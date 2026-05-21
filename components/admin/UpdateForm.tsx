"use client";

import { useState } from "react";

import { supabase } from "@/lib/supabase";
import type { UpdateEntry, UpdateTag, LocalizedString } from "@/lib/updates";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

import { Markdown } from "@/components/Markdown";
import { toast } from "sonner";

type Props = {
  initialData?: UpdateEntry | null;
  onSaved: () => void;
};

const NO_TAG = "__none__";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function UpdateForm({ initialData, onSaved }: Props) {
  const isEdit = !!initialData?.id;

  const [languages, setLanguages] = useState<string[]>(
    initialData?.title_i18n
      ? Object.keys(initialData.title_i18n)
      : ["en"]
  );

  const [activeLang, setActiveLang] = useState<string>(languages[0]);

  const [titleI18n, setTitleI18n] = useState<LocalizedString>(
    initialData?.title_i18n || { en: "" }
  );

  const [contentI18n, setContentI18n] = useState<LocalizedString>(
    initialData?.content_i18n || { en: "" }
  );

  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [date, setDate] = useState(
    initialData?.date ?? new Date().toISOString().slice(0, 10)
  );
  const [tag, setTag] = useState<UpdateTag | "">(initialData?.tag ?? "");

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateTitle(lang: string, value: string) {
    setTitleI18n((prev) => ({ ...prev, [lang]: value }));
    if (lang === "en" && !slugTouched) setSlug(slugify(value));
  }

  function updateContent(lang: string, value: string) {
    setContentI18n((prev) => ({ ...prev, [lang]: value }));
  }

  function addLanguage(lang: string) {
    if (languages.includes(lang)) return;
    setLanguages([...languages, lang]);
    setActiveLang(lang);
    setTitleI18n((prev) => ({ ...prev, [lang]: "" }));
    setContentI18n((prev) => ({ ...prev, [lang]: "" }));
  }

  function removeLanguage(lang: string) {
    if (languages.length === 1) return;

    const updated = languages.filter((l) => l !== lang);
    setLanguages(updated);

    setTitleI18n((prev) => {
      const copy = { ...prev };
      delete copy[lang];
      return copy;
    });

    setContentI18n((prev) => {
      const copy = { ...prev };
      delete copy[lang];
      return copy;
    });

    if (activeLang === lang) setActiveLang(updated[0]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    const hasTitle = Object.values(titleI18n).some((v) => v?.trim());
    const hasContent = Object.values(contentI18n).some((v) => v?.trim());

    if (!hasTitle || !hasContent || !slug.trim() || !date) {
      toast.error("Fill in title, slug, date, and content.");
      return;
    }

    setSubmitting(true);

    const payload = {
      title_i18n: titleI18n,
      content_i18n: contentI18n,
      slug: slug.trim(),
      date,
      tag: tag || null,
    };

    const { error } = isEdit
      ? await supabase.from("updates").update(payload).eq("id", initialData!.id!)
      : await supabase.from("updates").insert(payload);

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(isEdit ? "Update saved" : "Update published");
    onSaved();
  }

  return (
    <form onSubmit={submit} className="space-y-5">

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {languages.map((lang) => (
            <Button
              key={lang}
              type="button"
              size="sm"
              variant={activeLang === lang ? "default" : "outline"}
              onClick={() => setActiveLang(lang)}
            >
              {lang.toUpperCase()}
            </Button>
          ))}

          {languages.length < 2 && (
            <Select onValueChange={(val) => addLanguage(val)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Add language" />
              </SelectTrigger>
              <SelectContent>
                {!languages.includes("en") && (
                  <SelectItem value="en">English</SelectItem>
                )}
                {!languages.includes("ro") && (
                  <SelectItem value="ro">Română</SelectItem>
                )}
              </SelectContent>
            </Select>
          )}

          {languages.length > 1 && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => removeLanguage(activeLang)}
            >
              Remove {activeLang.toUpperCase()}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Title ({activeLang})
          </label>
          <Input
            value={titleI18n[activeLang] || ""}
            onChange={(e) => updateTitle(activeLang, e.target.value)}
            placeholder="What's new in this release?"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Slug</label>
          <Input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            placeholder="release-2026-05-21"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Date</label>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal"
              >
                <CalendarIcon size={16} className="mr-2 opacity-60" />
                {date ? format(new Date(date), "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date ? new Date(date) : undefined}
                onSelect={(d) => {
                  if (d) {
                    setDate(format(d, "yyyy-MM-dd"));
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Tag</label>
          <Select
            value={tag || NO_TAG}
            onValueChange={(v) => setTag(v === NO_TAG ? "" : (v as UpdateTag))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="No tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TAG}>No tag</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="fix">Fix</SelectItem>
              <SelectItem value="improved">Improved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">
          Content ({activeLang}, Markdown)
        </label>
        <Tabs defaultValue="edit">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <Textarea
              value={contentI18n[activeLang] || ""}
              onChange={(e) => updateContent(activeLang, e.target.value)}
              placeholder={"# Heading\n\nWrite your update in **Markdown**…"}
              rows={16}
              className="font-mono text-sm"
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-[16rem] rounded-lg border border-input p-4">
              {contentI18n[activeLang]?.trim() ? (
                <Markdown>{contentI18n[activeLang]}</Markdown>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nothing to preview yet.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting} className="rounded-xl">
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Publish update"}
        </Button>
      </div>

    </form>
  );
}

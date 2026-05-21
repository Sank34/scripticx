"use client";

import { useState } from "react";

import { supabase } from "@/lib/supabase";
import type { UpdateEntry, UpdateTag } from "@/lib/updates";

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

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [date, setDate] = useState(
    initialData?.date ?? new Date().toISOString().slice(0, 10)
  );
  const [tag, setTag] = useState<UpdateTag | "">(initialData?.tag ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");

  const [submitting, setSubmitting] = useState(false);

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !slug.trim() || !date || !content.trim()) {
      toast.error("Fill in title, slug, date, and content.");
      return;
    }

    setSubmitting(true);

    const payload = {
      title: title.trim(),
      slug: slug.trim(),
      date,
      tag: tag || null,
      content,
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
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
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
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
        <label className="text-sm font-medium">Content (Markdown)</label>
        <Tabs defaultValue="edit">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"# Heading\n\nWrite your update in **Markdown**…"}
              rows={16}
              className="font-mono text-sm"
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-[16rem] rounded-lg border border-input p-4">
              {content.trim() ? (
                <Markdown>{content}</Markdown>
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

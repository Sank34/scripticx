"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { AnnouncementDialog } from "@/components/announcements/AnnouncementDialog";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { announcementItemLimit, isAnnouncementUrl, type AnnouncementButton, type AnnouncementImage, type ScheduledAnnouncement } from "@/lib/scheduled-announcements";
import { supabase } from "@/lib/supabase";

const key = ["admin-scheduled-announcements"];
const endpoint = "/api/admin/announcements/scheduled";

async function request<T>(method: string, payload?: object | FormData): Promise<T> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) throw new Error("Sign in again.");
  const form = payload instanceof FormData;
  const response = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(payload && !form ? { "Content-Type": "application/json" } : {}),
    },
    body: form ? payload : payload ? JSON.stringify(payload) : undefined,
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result as T;
}

const copy = {
  en: {
    title: "Scheduled announcements", history: "Scheduled and past announcements", heading: "Title", message: "Message",
    start: "Starts", end: "Ends", chooseDate: "Choose a date", time: "Time", timezone: "Time zone",
    mascots: "Show ScripticX mascots", images: "Images", upload: "Upload image", uploading: "Uploading…",
    addUrl: "Add image URL", imageUrl: "Image URL", alt: "Alternative text", remove: "Remove",
    buttons: "Custom buttons", addButton: "Add button", buttonLabel: "Button label", buttonUrl: "Button destination",
    defaultButton: "Leave this empty to use the default Got it button.", preview: "Preview", publish: "Schedule announcement",
    success: "Announcement scheduled.", disabled: "Announcement disabled.", disable: "Disable",
    upcoming: "Scheduled", active: "Active", ended: "Ended", inactive: "Disabled", empty: "No announcements yet.",
    loading: "Loading announcements…", error: "Could not load announcements.", retry: "Retry",
    scheduleError: "Choose a valid start and end time.", assetError: "Check the image URLs and button labels and destinations.",
  },
  ro: {
    title: "Anunțuri programate", history: "Anunțuri programate și anterioare", heading: "Titlu", message: "Mesaj",
    start: "Începe", end: "Se încheie", chooseDate: "Alege o dată", time: "Ora", timezone: "Fus orar",
    mascots: "Afișează mascotele ScripticX", images: "Imagini", upload: "Încarcă o imagine", uploading: "Se încarcă…",
    addUrl: "Adaugă un URL", imageUrl: "URL imagine", alt: "Text alternativ", remove: "Elimină",
    buttons: "Butoane personalizate", addButton: "Adaugă un buton", buttonLabel: "Eticheta butonului", buttonUrl: "Destinația butonului",
    defaultButton: "Lasă lista goală pentru butonul implicit Am înțeles.", preview: "Previzualizează", publish: "Programează anunțul",
    success: "Anunț programat.", disabled: "Anunț dezactivat.", disable: "Dezactivează",
    upcoming: "Programat", active: "Activ", ended: "Încheiat", inactive: "Dezactivat", empty: "Nu există încă anunțuri.",
    loading: "Se încarcă anunțurile…", error: "Anunțurile nu au putut fi încărcate.", retry: "Reîncearcă",
    scheduleError: "Alege date valide pentru început și sfârșit.", assetError: "Verifică URL-urile imaginilor, etichetele și destinațiile butoanelor.",
  },
};

export function ScheduledAnnouncementsAdmin() {
  const { locale } = useLanguage();
  const text = copy[locale];
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [mascots, setMascots] = useState(true);
  const [images, setImages] = useState<AnnouncementImage[]>([]);
  const [buttons, setButtons] = useState<AnnouncementButton[]>([]);
  const [preview, setPreview] = useState(false);
  const query = useQuery({ queryKey: key, queryFn: () => request<ScheduledAnnouncement[]>("GET") });
  const errorToast = (error: Error) => toast.error(error.message);
  const create = useMutation({
    mutationFn: (draft: object) => request("POST", draft),
    onSuccess: () => {
      setTitle(""); setBody(""); setStart(""); setEnd(""); setImages([]); setButtons([]); setMascots(true);
      toast.success(text.success);
      void client.invalidateQueries({ queryKey: key });
      void client.invalidateQueries({ queryKey: ["scheduled-announcement"] });
    },
    onError: errorToast,
  });
  const upload = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.set("image", file);
      return request<{ src: string }>("POST", form);
    },
    onSuccess: ({ src }) => setImages((current) => [...current, { src, alt: "" }]),
    onError: errorToast,
  });
  const disable = useMutation({
    mutationFn: (id: string) => request("PATCH", { id }),
    onSuccess: () => {
      toast.success(text.disabled);
      void client.invalidateQueries({ queryKey: key });
      void client.invalidateQueries({ queryKey: ["scheduled-announcement"] });
    },
    onError: errorToast,
  });

  const draft = { title: title.trim(), body: body.trim(), show_mascots: mascots, images, buttons };
  const assetsValid = images.every(({ src }) => isAnnouncementUrl(src.trim()))
    && buttons.every(({ label, href }) => label.trim() && isAnnouncementUrl(href.trim(), true));
  const ready = draft.title.length >= 2 && draft.body.length >= 2;
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || create.isPending || upload.isPending) return;
    const startsAt = new Date(start);
    const endsAt = new Date(end);
    if (!start || !end || !(endsAt > startsAt) || endsAt.getTime() <= Date.now()) {
      toast.error(text.scheduleError);
      return;
    }
    if (!assetsValid) {
      toast.error(text.assetError);
      return;
    }
    create.mutate({ ...draft, starts_at: startsAt.toISOString(), ends_at: endsAt.toISOString() });
  }

  return (
    <section className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{text.title}</CardTitle></CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={submit}>
            <label className="block space-y-1 text-sm font-medium">{text.heading}<Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required /></label>
            <label className="block space-y-1 text-sm font-medium">{text.message}<Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} maxLength={2000} required /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div role="group" aria-label={text.start} className="space-y-1"><p className="text-sm font-medium">{text.start}</p>
                <DateTimePicker value={start} onChange={setStart} locale={locale} placeholder={text.chooseDate} timeLabel={text.time} />
              </div>
              <div role="group" aria-label={text.end} className="space-y-1"><p className="text-sm font-medium">{text.end}</p>
                <DateTimePicker value={end} onChange={setEnd} locale={locale} placeholder={text.chooseDate} timeLabel={text.time} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{text.timezone} · {dateFormat.resolvedOptions().timeZone}</p>
            <label htmlFor="announcement-mascots" className="flex items-center gap-3 text-sm font-medium">
              <Switch id="announcement-mascots" checked={mascots} onCheckedChange={setMascots} />{text.mascots}
            </label>

            <fieldset className="space-y-3 border-t pt-3">
              <legend className="pr-2 text-sm font-medium">{text.images} ({images.length}/{announcementItemLimit})</legend>
              {images.map((image, index) => (
                <div key={index} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <label className="space-y-1 text-sm">{text.imageUrl}<Input type="url" maxLength={500} value={image.src} onChange={(event) => setImages((current) => current.map((item, i) => i === index ? { ...item, src: event.target.value } : item))} /></label>
                  <label className="space-y-1 text-sm">{text.alt}<Input value={image.alt} maxLength={160} onChange={(event) => setImages((current) => current.map((item, i) => i === index ? { ...item, alt: event.target.value } : item))} /></label>
                  <Button type="button" variant="outline" onClick={() => setImages((current) => current.filter((_, i) => i !== index))}>{text.remove}</Button>
                </div>
              ))}
              {images.length < announcementItemLimit && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="outline" disabled={upload.isPending} onClick={() => setImages((current) => [...current, { src: "", alt: "" }])}>{text.addUrl}</Button>
                  <Input type="file" className="w-auto max-w-full" aria-label={text.upload} accept="image/png,image/jpeg,image/webp,image/gif" disabled={upload.isPending} onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (file) upload.mutate(file);
                  }} />
                  {upload.isPending && <span role="status" className="text-sm">{text.uploading}</span>}
                </div>
              )}
            </fieldset>

            <fieldset className="space-y-3 border-t pt-3">
              <legend className="pr-2 text-sm font-medium">{text.buttons} ({buttons.length}/{announcementItemLimit})</legend>
              <p className="text-xs text-muted-foreground">{text.defaultButton}</p>
              {buttons.map((button, index) => (
                <div key={index} className="grid items-end gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <label className="space-y-1 text-sm">{text.buttonLabel}<Input maxLength={48} value={button.label} onChange={(event) => setButtons((current) => current.map((item, i) => i === index ? { ...item, label: event.target.value } : item))} /></label>
                  <label className="space-y-1 text-sm">{text.buttonUrl}<Input maxLength={500} value={button.href} onChange={(event) => setButtons((current) => current.map((item, i) => i === index ? { ...item, href: event.target.value } : item))} /></label>
                  <Button type="button" variant="outline" onClick={() => setButtons((current) => current.filter((_, i) => i !== index))}>{text.remove}</Button>
                </div>
              ))}
              {buttons.length < announcementItemLimit && <Button type="button" variant="outline" onClick={() => setButtons((current) => [...current, { label: "", href: "" }])}>{text.addButton}</Button>}
            </fieldset>

            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              <Button type="button" variant="outline" disabled={!ready || !assetsValid} onClick={() => setPreview(true)}>{text.preview}</Button>
              <Button type="submit" disabled={!ready || create.isPending || upload.isPending} aria-busy={create.isPending}>{text.publish}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{text.history}</CardTitle></CardHeader>
        <CardContent>
          {query.isPending ? <p role="status" className="text-sm">{text.loading}</p> : query.isError ? (
            <div className="flex flex-wrap items-center gap-2"><p role="alert" className="text-sm">{text.error}</p><Button variant="outline" onClick={() => void query.refetch()}>{text.retry}</Button></div>
          ) : query.data.length ? (
            <ul className="divide-y">
              {query.data.map((item) => {
                const now = Date.now();
                const ended = Date.parse(item.ends_at) <= now;
                const status = item.disabled_at ? text.inactive : ended ? text.ended : Date.parse(item.starts_at) > now ? text.upcoming : text.active;
                return (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div className="min-w-0"><p className="text-sm font-medium wrap-anywhere">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{status} · {dateFormat.format(new Date(item.starts_at))} → {dateFormat.format(new Date(item.ends_at))}</p>
                    </div>
                    {!ended && !item.disabled_at && <Button variant="outline" disabled={disable.isPending} onClick={() => disable.mutate(item.id)}>{text.disable}</Button>}
                  </li>
                );
              })}
            </ul>
          ) : <p className="text-sm text-muted-foreground">{text.empty}</p>}
        </CardContent>
      </Card>
      {preview && <AnnouncementDialog announcement={draft} preview onAcknowledge={() => setPreview(false)} />}
    </section>
  );
}

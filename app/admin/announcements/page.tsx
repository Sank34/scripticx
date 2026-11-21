"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { ScheduledAnnouncementsAdmin } from "@/components/announcements/ScheduledAnnouncementsAdmin";
import { useLanguage } from "@/components/LanguageProvider";
import RouteGuard from "@/components/RouteGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

export default function AdminAnnouncementsPage() {
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [href, setHref] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    setBusy(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session) throw new Error("Your session has expired. Please sign in again.");

      const response = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ title, body, href }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not send announcement");
      toast.success(`Announcement sent to ${result.created} users`);
      setTitle(""); setBody(""); setHref("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not send announcement"); }
    finally { setBusy(false); }
  }
  return (
    <RouteGuard requireAdmin>
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center gap-3">
          <Megaphone className="size-5" aria-hidden="true" />
          <h1 className="text-3xl font-semibold tracking-tight">{ro ? "Anunțuri" : "Announcements"}</h1>
        </header>
        <ScheduledAnnouncementsAdmin />
        <Card>
          <CardHeader>
            <CardTitle>{ro ? "Trimite o notificare" : "Send a notification"}</CardTitle>
            <CardDescription>{ro ? "Mesajul apare imediat în inboxul tuturor utilizatorilor." : "The message appears immediately in every user’s inbox."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex flex-col gap-1 text-sm">{ro ? "Titlu" : "Title"}
              <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} />
            </label>
            <label className="flex flex-col gap-1 text-sm">{ro ? "Mesaj" : "Message"}
              <Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={6} maxLength={2000} />
            </label>
            <label className="flex flex-col gap-1 text-sm">{ro ? "Link opțional" : "Optional link"}
              <Input value={href} onChange={(event) => setHref(event.target.value)} placeholder="/updates" maxLength={500} />
            </label>
            <Button onClick={() => void send()} disabled={busy || title.trim().length < 2 || body.trim().length < 2}>
              <Megaphone aria-hidden="true" />{ro ? (busy ? "Se trimite…" : "Trimite tuturor") : (busy ? "Sending…" : "Send to all users")}
            </Button>
          </CardContent>
        </Card>
      </div>
    </RouteGuard>
  );
}

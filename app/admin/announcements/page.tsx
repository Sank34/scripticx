"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import RouteGuard from "@/components/RouteGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";

export default function AdminAnnouncementsPage() {
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
  return <RouteGuard requireAdmin><div className="mx-auto max-w-3xl space-y-6"><header><div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Megaphone className="size-4" />Platform announcements</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">Send an announcement</h1><p className="mt-2 text-sm text-muted-foreground">The message appears in every user’s ScripticX notifications.</p></header><Card><CardContent className="space-y-4 p-5"><Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Title" maxLength={160} /><Textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Message" rows={6} maxLength={2000} /><Input value={href} onChange={(event) => setHref(event.target.value)} placeholder="Optional link, e.g. /updates" maxLength={500} /><Button onClick={() => void send()} disabled={busy || title.trim().length < 2 || body.trim().length < 2} className="gap-2"><Megaphone className="size-4" />{busy ? "Sending…" : "Send to all users"}</Button></CardContent></Card></div></RouteGuard>;
}

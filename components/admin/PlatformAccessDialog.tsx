"use client";

import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function PlatformAccessForm({ onSaved, onCancel }: { onSaved?: () => void; onCancel?: () => void }) {
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<{ mode: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const status = useQuery({
    queryKey: ["admin", "platform-settings"],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.from("platform_settings").select("lockdown_enabled,lockdown_mode,lockdown_message").eq("id", "global").single();
      if (error) throw error;
      return { mode: data.lockdown_enabled ? data.lockdown_mode || "maintenance" : "normal", message: data.lockdown_message || "Maintenance" };
    },
  });
  const values = draft ?? status.data ?? { mode: "normal", message: "Maintenance" };
  async function save() {
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const response = await fetch("/api/admin/platform/lockdown", { method: "POST", headers: { Authorization: `Bearer ${data.session?.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ enabled: values.mode !== "normal", mode: values.mode, message: values.message }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await queryClient.invalidateQueries({ queryKey: ["admin", "platform-settings"] });
      await queryClient.invalidateQueries({ queryKey: ["platform-status"] });
      toast.success(ro ? "Accesul platformei a fost actualizat" : "Platform access updated");
      onSaved?.();
    } catch (error) { toast.error((error as Error).message); }
    finally { setBusy(false); }
  }
  if (status.isPending) return <p role="status" className="py-4 text-muted-foreground">{ro ? "Se încarcă setările…" : "Loading settings…"}</p>;
  if (status.isError) return <div role="alert" className="space-y-3"><p>{ro ? "Setările nu au putut fi încărcate." : "Could not load settings."}</p><Button variant="outline" onClick={() => void status.refetch()}>{ro ? "Reîncearcă" : "Retry"}</Button></div>;
  return <form onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-5">
    <div className="space-y-2"><Label htmlFor="platform-mode">{ro ? "Mod platformă" : "Platform mode"}</Label><Select value={values.mode} onValueChange={mode => setDraft({ ...values, mode })} disabled={busy}><SelectTrigger id="platform-mode" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="maintenance">Maintenance</SelectItem><SelectItem value="competition">Competition</SelectItem></SelectContent></Select></div>
    <div className="space-y-2"><Label htmlFor="platform-message">{ro ? "Mesaj afișat" : "Displayed message"}</Label><Textarea id="platform-message" value={values.message} onChange={event => setDraft({ ...values, message: event.target.value })} minLength={3} maxLength={500} required disabled={busy} /></div>
    <div className="flex justify-end gap-2 border-t pt-4">{onCancel && <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>{ro ? "Anulează" : "Cancel"}</Button>}<Button disabled={busy || status.isFetching}>{busy ? ro ? "Se salvează…" : "Saving…" : ro ? "Salvează" : "Save"}</Button></div>
  </form>;
}

export function PlatformAccessDialog({ children }: { children?: ReactNode }) {
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>{children ?? <Button variant="outline">{ro ? "Acces platformă" : "Platform access"}</Button>}</DialogTrigger>
    <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto duration-200 ease-out max-sm:duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 sm:max-w-lg motion-reduce:animate-none motion-reduce:transition-none">
      <DialogHeader className="pr-6"><DialogTitle>{ro ? "Acces platformă" : "Platform access"}</DialogTitle><DialogDescription>{ro ? "Maintenance permite doar administratorii și rolurile cu acces explicit. Competition restricționează participanții la competiții, documentație și exemple." : "Maintenance allows only admins and roles with explicit access. Competition restricts participants to competitions, documentation and examples."}</DialogDescription></DialogHeader>
      <PlatformAccessForm onSaved={() => setOpen(false)} onCancel={() => setOpen(false)} />
    </DialogContent>
  </Dialog>;
}

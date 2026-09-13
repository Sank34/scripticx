"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Search, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { UserListItem } from "@/components/user/UserListItem";
import type { EquippedRewards } from "@/lib/rewards";
import { supabase } from "@/lib/supabase";
import { PERMISSIONS, type Permission } from "@/lib/permissions";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";

type Role = { id: string; name: string; description: string; permissions: Permission[]; platform_user_roles?: { count: number }[] };
type User = { id: string; username: string; avatar_url?: string | null; equipped_rewards?: EquippedRewards | null; role: string; platform_user_roles?: { role_id: string }[] };
function RoleUserIdentity({ user }: { user: User }) {
  return <UserListItem
    avatarUrl={user.avatar_url}
    equippedRewards={user.equipped_rewards}
    username={user.username}
    href={`/u/${encodeURIComponent(user.username)}`}
    meta={user.role === "admin" ? "Admin" : undefined}
    variant="row"
    showArrow={false}
    className="min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  />;
}

async function request<T>(suffix = "", method = "GET", body?: unknown): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const response = await fetch(`/api/admin/roles${suffix}`, { method, headers: { Authorization: `Bearer ${data.session?.access_token ?? ""}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed");
  return result as T;
}
const emptyRole = (): Role => ({ id: "", name: "", description: "", permissions: [] });

export default function RolesPage() {
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Role | null>(null);
  const [dirty, setDirty] = useState(false);
  const [nextDraft, setNextDraft] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  useEffect(() => { const id = setTimeout(() => setDebouncedSearch(search.trim()), 250); return () => clearTimeout(id); }, [search]);
  const roles = useQuery({ queryKey: ["admin", "roles"], queryFn: () => request<{ roles: Role[] }>() });
  const users = useQuery({ queryKey: ["admin", "roles", "search", debouncedSearch], queryFn: () => request<{ users: User[] }>(`?search=${encodeURIComponent(debouncedSearch)}`), enabled: Boolean(draft?.id && debouncedSearch) });
  const members = useQuery({ queryKey: ["admin", "roles", "members", draft?.id, offset], queryFn: () => request<{ members: { user_id: string; profiles: User }[]; count: number }>(`?members=${draft!.id}&offset=${offset}`), enabled: Boolean(draft?.id) });
  function choose(role: Role) {
    if (dirty) { setNextDraft(role); return; }
    setDraft({ ...role, permissions: [...role.permissions] }); setOffset(0); setSearch(""); setDirty(false);
  }
  function edit(patch: Partial<Role>) { setDraft(current => current ? { ...current, ...patch } : current); setDirty(true); }
  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      const result = await request<{ role: Role }>("", "POST", { id: draft.id || undefined, name: draft.name, description: draft.description, permissions: draft.permissions });
      setDraft(result.role); setDirty(false);
      await qc.invalidateQueries({ queryKey: ["admin", "roles"] });
      await qc.invalidateQueries({ queryKey: ["admin", "users"] });
      await qc.invalidateQueries({ queryKey: ["platform-permissions"] });
      toast.success(ro ? "Rol salvat" : "Role saved");
    } catch (error) { toast.error((error as Error).message); } finally { setBusy(false); }
  }
  async function assign(userId: string, assigned: boolean) {
    setBusy(true);
    try {
      await request("", "PUT", { roleId: draft!.id, userId, assigned });
      await qc.invalidateQueries({ queryKey: ["admin", "roles"] });
      await qc.invalidateQueries({ queryKey: ["admin", "users"] });
      await qc.invalidateQueries({ queryKey: ["platform-permissions"] });
      toast.success(ro ? "Rolurile utilizatorului au fost actualizate" : "User roles updated");
    } catch (error) { toast.error((error as Error).message); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true);
    try { await request("", "DELETE", { id: draft!.id }); setDraft(null); setDirty(false); setDeleting(false); await qc.invalidateQueries({ queryKey: ["admin", "roles"] });
      await qc.invalidateQueries({ queryKey: ["admin", "users"] }); toast.success(ro ? "Rol șters" : "Role deleted"); }
    catch (error) { toast.error((error as Error).message); } finally { setBusy(false); }
  }
  return <div className="mx-auto w-full max-w-6xl space-y-6 p-4 pb-24 md:p-6">
    <div><Button variant="link" className="h-auto p-0 text-muted-foreground" asChild><Link href="/admin"><ArrowLeft className="size-4" />Admin</Link></Button>
      <h1 className="mt-3 text-2xl font-semibold">{ro ? "Roluri și permisiuni" : "Roles and permissions"}</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{ro ? "Admin are acces complet. Rolurile personalizate adaugă permisiuni peste accesul obișnuit al unui utilizator. Doar administratorii pot crea și atribui roluri." : "Admins have full access. Custom roles add permissions to a user's normal access. Only full administrators can create and assign roles."}</p>
    </div>
    {roles.isError && <div role="alert" className="rounded-xl border p-4 text-sm">{(roles.error as Error).message}<Button variant="outline" className="ml-3" onClick={() => roles.refetch()}>{ro ? "Reîncearcă" : "Retry"}</Button></div>}
    <div className="grid items-start gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="space-y-3"><Button className="w-full" disabled={busy} onClick={() => choose(emptyRole())}><Plus className="size-4" />{ro ? "Rol nou" : "New role"}</Button>
        <div className="overflow-hidden rounded-xl border">
          {roles.isPending && <p className="p-4 text-sm text-muted-foreground">{ro ? "Se încarcă rolurile…" : "Loading roles…"}</p>}
          {roles.data?.roles.length === 0 && <p className="p-4 text-sm text-muted-foreground">{ro ? "Nu ai roluri personalizate încă." : "No custom roles yet."}</p>}
          {roles.data?.roles.map(role => <button key={role.id} disabled={busy} aria-pressed={draft?.id === role.id} onClick={() => choose(role)} className="flex w-full items-center justify-between gap-3 border-b px-4 py-3 text-left text-sm last:border-0 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-pressed:bg-muted"><span className="truncate font-medium">{role.name}</span><span className="text-muted-foreground">{role.platform_user_roles?.[0]?.count ?? 0}</span></button>)}
        </div>
      </aside>
      {!draft ? <div className="rounded-xl border p-6 text-sm text-muted-foreground">{ro ? "Selectează un rol pentru a-i modifica accesul sau creează unul nou." : "Select a role to edit its access, or create a new one."}</div> : <div className="min-w-0 space-y-5">
        <form onSubmit={event => { event.preventDefault(); void save(); }} className="space-y-5 rounded-xl border bg-card p-4 sm:p-6">
          <div className="space-y-2"><Label htmlFor="role-name">{ro ? "Nume rol" : "Role name"}</Label><Input id="role-name" value={draft.name} maxLength={60} required disabled={busy} onChange={event => edit({ name: event.target.value })} placeholder={ro ? "De exemplu: Designer" : "For example: Designer"} /></div>
          <div className="space-y-2"><Label htmlFor="role-description">{ro ? "Descriere (opțional)" : "Description (optional)"}</Label><Textarea id="role-description" value={draft.description} maxLength={500} disabled={busy} onChange={event => edit({ description: event.target.value })} /></div>
          <fieldset disabled={busy} className="space-y-3"><legend className="mb-2 font-medium">{ro ? "Permisiuni" : "Permissions"}</legend>
            <p className="text-sm text-muted-foreground">{ro ? "Accesul la panoul admin este inclus automat când selectezi un modul. Maintenance se acordă separat." : "Admin panel access is included automatically when you select a module. Maintenance access is granted separately."}</p>
            <div className="grid gap-x-5 sm:grid-cols-2">{PERMISSIONS.map(permission => <label key={permission.key} className="flex min-h-12 cursor-pointer items-start gap-3 border-b py-3 text-sm"><Checkbox disabled={busy} className="mt-0.5" checked={draft.permissions.includes(permission.key)} onCheckedChange={checked => edit({ permissions: checked === true ? [...draft.permissions, permission.key] : draft.permissions.filter(key => key !== permission.key) })} /><span>{ro ? permission.ro : permission.en}</span></label>)}</div>
          </fieldset>
          <div className="flex flex-wrap items-center justify-between gap-3"><Button type="submit" disabled={busy || !draft.name.trim() || (!dirty && Boolean(draft.id))}>{busy ? (ro ? "Se salvează…" : "Saving…") : ro ? "Salvează rolul" : "Save role"}</Button>{draft.id && <Button type="button" variant="ghost" disabled={busy} className="text-destructive" onClick={() => setDeleting(true)}><Trash2 className="size-4" />{ro ? "Șterge rolul" : "Delete role"}</Button>}</div>
        </form>
        {draft.id && <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-6"><h2 className="font-semibold">{ro ? "Utilizatori cu acest rol" : "Users with this role"} ({members.data?.count ?? 0})</h2>
          <div className="space-y-2"><Label htmlFor="role-user-search">{ro ? "Caută un username pentru a atribui rolul" : "Search a username to assign this role"}</Label><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="role-user-search" className="pl-9" value={search} onChange={event => setSearch(event.target.value)} /></div></div>
          {debouncedSearch && <div className="divide-y rounded-lg border" aria-live="polite">{users.isFetching ? <p className="p-3 text-sm">{ro ? "Se caută…" : "Searching…"}</p> : users.isError ? <p role="alert" className="p-3 text-sm">{users.error.message}</p> : !users.data?.users.length ? <p className="p-3 text-sm text-muted-foreground">{ro ? "Niciun utilizator găsit." : "No matching users."}</p> : users.data.users.map(user => {
            const assigned = user.platform_user_roles?.some(role => role.role_id === draft.id);
            return <div key={user.id} className="flex items-center justify-between gap-3 p-3 text-sm"><RoleUserIdentity user={user} /><Button variant="outline" size="sm" className="shrink-0" disabled={busy || assigned || user.role === "admin"} onClick={() => assign(user.id, true)}>{user.role === "admin" ? ro ? "Acces complet" : "Full access" : assigned ? ro ? "Atribuit" : "Assigned" : ro ? "Atribuie" : "Assign"}</Button></div>;
          })}</div>}
          {members.isError && <p role="alert" className="text-sm">{members.error.message}</p>}
          {!members.isPending && members.data?.count === 0 && <p className="text-sm text-muted-foreground">{ro ? "Acest rol nu este atribuit nimănui încă." : "This role has not been assigned yet."}</p>}
          <div className="divide-y">{members.data?.members.map(member => <div key={member.user_id} className="flex items-center justify-between gap-3 py-3 text-sm">{member.profiles ? <RoleUserIdentity user={member.profiles} /> : <span className="min-w-0 truncate">{member.user_id}</span>}<Button size="sm" variant="ghost" className="shrink-0" disabled={busy} onClick={() => assign(member.user_id, false)}><UserMinus className="size-4" />{ro ? "Retrage rolul" : "Remove role"}</Button></div>)}</div>
          {(members.data?.count ?? 0) > 50 && <div className="flex justify-between"><Button variant="outline" disabled={offset === 0 || busy} onClick={() => setOffset(Math.max(0, offset - 50))}>{ro ? "Înapoi" : "Previous"}</Button><Button variant="outline" disabled={offset + 50 >= (members.data?.count ?? 0) || busy} onClick={() => setOffset(offset + 50)}>{ro ? "Înainte" : "Next"}</Button></div>}
        </section>}
      </div>}
    </div>
    <AlertDialog open={deleting} onOpenChange={setDeleting}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{ro ? "Ștergi acest rol?" : "Delete this role?"}</AlertDialogTitle><AlertDialogDescription>{ro ? "Rolul va fi retras de la toți utilizatorii. Conturile lor și celelalte roluri rămân." : "This role will be removed from all users. Their accounts and other roles remain."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>{ro ? "Anulează" : "Cancel"}</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={event => { event.preventDefault(); void remove(); }}>{ro ? "Șterge" : "Delete"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={Boolean(nextDraft)} onOpenChange={open => { if (!open) setNextDraft(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{ro ? "Renunți la modificările nesalvate?" : "Discard unsaved changes?"}</AlertDialogTitle><AlertDialogDescription>{ro ? "Modificările acestui rol nu au fost salvate." : "Your changes to this role have not been saved."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{ro ? "Continuă editarea" : "Keep editing"}</AlertDialogCancel><AlertDialogAction onClick={() => { setDraft(nextDraft); setNextDraft(null); setDirty(false); setSearch(""); setOffset(0); }}>{ro ? "Renunță" : "Discard"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

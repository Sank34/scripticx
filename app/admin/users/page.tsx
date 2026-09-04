"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  ExternalLink,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { AdminStatTile } from "@/components/admin/AdminStatTile";
import {
  AdminUserEditorDrawer,
  type AdminManagedUser,
} from "@/components/admin/AdminUserEditorDrawer";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { useLanguage } from "@/components/LanguageProvider";
import RouteGuard from "@/components/RouteGuard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

type RoleFilter = "all" | "admin" | "user";
type StatusFilter = "all" | "active" | "banned";

function UsersPageSkeleton() {
  return (
    <main className="sx-page space-y-7 pb-16">
      <div className="space-y-3">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-5 w-[min(100%,560px)]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-[var(--sx-radius-card)]" />)}
      </div>
      <Skeleton className="h-[560px] rounded-[var(--sx-radius-card)]" />
    </main>
  );
}

function AdminUsersContent() {
  const { locale } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ro = locale === "ro";
  const copy = ro
    ? {
        active: "Activ",
        activeUsers: "Utilizatori activi",
        admins: "Administratori",
        allRoles: "Toate rolurile",
        allStatuses: "Toate statusurile",
        banned: "Suspendat",
        bannedUsers: "Conturi suspendate",
        deleteConfirm: "Această acțiune șterge definitiv contul, profilul și fișierele avatarului.",
        deleteTitle: "Ștergi utilizatorul?",
        empty: "Nu există utilizatori pentru filtrele selectate.",
        manage: "Administrează",
        refresh: "Reîncarcă",
        results: "rezultate",
        role: "Rol",
        search: "Caută după username sau ID…",
        score: "Punctaj",
        status: "Status",
        subtitle: "Controlează profilurile, accesul, punctele și starea conturilor dintr-un singur loc.",
        title: "User management",
        total: "Total utilizatori",
        users: "Utilizatori",
        view: "Vezi profilul",
        you: "Tu",
      }
    : {
        active: "Active",
        activeUsers: "Active users",
        admins: "Administrators",
        allRoles: "All roles",
        allStatuses: "All statuses",
        banned: "Suspended",
        bannedUsers: "Suspended accounts",
        deleteConfirm: "This permanently deletes the account, profile, and stored avatar files.",
        deleteTitle: "Delete user?",
        empty: "No users match the selected filters.",
        manage: "Manage",
        refresh: "Refresh",
        results: "results",
        role: "Role",
        search: "Search by username or user ID…",
        score: "Score",
        status: "Status",
        subtitle: "Control profiles, access, points, and account status from one place.",
        title: "User management",
        total: "Total users",
        users: "Users",
        view: "View profile",
        you: "You",
      };

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminManagedUser | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const usersQueryKey = ["admin", "users", user?.id] as const;
  const usersQuery = useQuery({
    queryKey: usersQueryKey,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, banner_url, bio, pronouns, equipped_rewards, role, banned, total_score, reward_points")
        .order("username", { ascending: true });
      if (error) throw error;
      return (data || []) as AdminManagedUser[];
    },
    enabled: Boolean(user),
    staleTime: 2 * 60 * 1000,
  });

  const users = useMemo(() => usersQuery.data || [], [usersQuery.data]);
  const selectedUser = users.find((listedUser) => listedUser.id === selectedUserId) || null;
  const stats = useMemo(() => ({
    active: users.filter((listedUser) => !listedUser.banned).length,
    admins: users.filter((listedUser) => listedUser.role === "admin").length,
    banned: users.filter((listedUser) => listedUser.banned).length,
    total: users.length,
  }), [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((listedUser) => {
      const matchesQuery = !query
        || listedUser.username?.toLowerCase().includes(query)
        || listedUser.id.toLowerCase().includes(query);
      const matchesRole = roleFilter === "all" || listedUser.role === roleFilter;
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "banned" ? listedUser.banned : !listedUser.banned);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [roleFilter, search, statusFilter, users]);

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) throw error || new Error("Session expired");
    return data.session.access_token;
  }

  async function saveUser(userId: string, formData: FormData) {
    setSavingUserId(userId);
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const result = (await response.json()) as { error?: string; user?: AdminManagedUser };
      if (!response.ok || !result.user) throw new Error(result.error || "Could not update user");

      queryClient.setQueryData<AdminManagedUser[]>(usersQueryKey, (current = []) =>
        current.map((listedUser) => listedUser.id === userId ? { ...listedUser, ...result.user } : listedUser)
      );
      void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
      setSelectedUserId(null);
      toast.success(ro ? "Utilizatorul a fost actualizat." : "User updated.");
    } catch (error) {
      toast.error(ro ? "Utilizatorul nu a putut fi actualizat." : "Could not update user.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSavingUserId(null);
    }
  }

  async function deleteUser(target: AdminManagedUser) {
    if (target.id === user?.id || deletingId) return;
    setDeletingId(target.id);
    try {
      const token = await getAccessToken();
      const response = await fetch(`/api/admin/users/${encodeURIComponent(target.id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = (await response.json()) as {
        blockers?: Array<{
          column_name: string;
          constraint_name: string;
          schema_name: string;
          table_name: string;
        }>;
        code?: string;
        error?: string;
      };
      if (!response.ok) {
        const blocker = result.blockers?.[0];
        const blockerMessage = blocker
          ? ro
            ? `Contul este încă referit de ${blocker.schema_name}.${blocker.table_name}.${blocker.column_name} (${blocker.constraint_name}).`
            : `The account is still referenced by ${blocker.schema_name}.${blocker.table_name}.${blocker.column_name} (${blocker.constraint_name}).`
          : null;
        throw new Error(blockerMessage || result.error || "Could not delete user");
      }

      queryClient.setQueryData<AdminManagedUser[]>(usersQueryKey, (current = []) =>
        current.filter((listedUser) => listedUser.id !== target.id)
      );
      void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
      setDeleteTarget(null);
      setSelectedUserId(null);
      toast.success(ro ? "Utilizatorul a fost șters." : "User deleted.");
    } catch (error) {
      toast.error(ro ? "Utilizatorul nu a putut fi șters." : "Could not delete user.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setDeletingId(null);
    }
  }

  if (usersQuery.isPending) return <UsersPageSkeleton />;

  return (
    <main className="sx-page space-y-7 pb-16">
      <PageHeader
        title={copy.title}
        subtitle={copy.subtitle}
        action={(
          <Button variant="outline" onClick={() => void usersQuery.refetch()} disabled={usersQuery.isFetching}>
            <RefreshCw className={usersQuery.isFetching ? "animate-spin" : undefined} />
            {copy.refresh}
          </Button>
        )}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={ro ? "Statistici utilizatori" : "User statistics"}>
        <AdminStatTile pending={false} label={copy.total} value={stats.total} footer={copy.users} icon={<UsersRound className="size-4 text-muted-foreground" />} />
        <AdminStatTile pending={false} label={copy.activeUsers} value={stats.active} footer={copy.active} icon={<UserRoundCheck className="size-4 text-[var(--sx-success)]" />} />
        <AdminStatTile pending={false} label={copy.admins} value={stats.admins} footer="ScripticX" icon={<ShieldCheck className="size-4 text-muted-foreground" />} />
        <AdminStatTile pending={false} label={copy.bannedUsers} value={stats.banned} footer={copy.banned} icon={<Ban className="size-4 text-destructive" />} />
      </section>

      {usersQuery.isError ? (
        <section className="sx-surface">
          <EmptyState
            icon={<UsersRound className="size-6" />}
            title={ro ? "Utilizatorii nu au putut fi încărcați." : "Users could not be loaded."}
            description={usersQuery.error instanceof Error ? usersQuery.error.message : undefined}
            action={<Button variant="outline" onClick={() => void usersQuery.refetch()}>{copy.refresh}</Button>}
          />
        </section>
      ) : (
        <section className="sx-surface overflow-hidden">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative min-w-0 flex-1 lg:max-w-xl">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.search} className="pl-9" />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as RoleFilter)}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{copy.allRoles}</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{copy.allStatuses}</SelectItem>
                  <SelectItem value="active">{copy.active}</SelectItem>
                  <SelectItem value="banned">{copy.banned}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between border-b bg-muted/30 px-5 py-2.5 text-xs text-muted-foreground">
            <span>{filteredUsers.length} {copy.results}</span>
            <span className="hidden lg:inline">{copy.manage}</span>
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState icon={<Search className="size-6" />} title={copy.empty} />
          ) : (
            <div className="divide-y">
              {filteredUsers.map((listedUser) => {
                const isSelf = listedUser.id === user?.id;
                return (
                  <article
                    key={listedUser.id}
                    className="grid gap-4 px-5 py-4 transition-colors hover:bg-muted/25 lg:grid-cols-[minmax(0,1.6fr)_110px_120px_120px_auto] lg:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar
                        avatarUrl={listedUser.avatar_url}
                        username={listedUser.username}
                        equippedRewards={listedUser.equipped_rewards}
                        className="size-10"
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-medium">{listedUser.username || "User"}</p>
                          {isSelf && <Badge variant="secondary">{copy.you}</Badge>}
                        </div>
                        <p className="truncate font-mono text-[11px] text-muted-foreground">{listedUser.id}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground lg:hidden">{copy.score}</p>
                      <p className="font-mono text-sm tabular-nums">{Number(listedUser.total_score) || 0}</p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground lg:hidden">{copy.role}</p>
                      <Badge variant={listedUser.role === "admin" ? "default" : "secondary"} className="capitalize">
                        {listedUser.role || "user"}
                      </Badge>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground lg:hidden">{copy.status}</p>
                      <Badge variant={listedUser.banned ? "destructive" : "outline"}>
                        {listedUser.banned ? copy.banned : copy.active}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 lg:justify-end">
                      {listedUser.username && (
                        <Button asChild size="icon-sm" variant="ghost" aria-label={copy.view}>
                          <Link href={`/u/${listedUser.username}`} target="_blank"><ExternalLink /></Link>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => setSelectedUserId(listedUser.id)}>
                        <Pencil />{copy.manage}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      <AdminUserEditorDrawer
        actorId={user?.id}
        locale={locale}
        open={Boolean(selectedUser)}
        user={selectedUser}
        saving={savingUserId === selectedUser?.id}
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !savingUserId) setSelectedUserId(null);
        }}
        onSave={saveUser}
        onDelete={(target) => setDeleteTarget(target)}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(nextOpen) => !nextOpen && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.username ? `@${deleteTarget.username}. ` : ""}{copy.deleteConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{ro ? "Anulează" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => deleteTarget && void deleteUser(deleteTarget)}
              disabled={Boolean(deletingId)}
            >
              {deletingId ? <LoaderCircle className="animate-spin" /> : <Trash2 />}
              {ro ? "Șterge definitiv" : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

export default function AdminUsersPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminUsersContent />
    </RouteGuard>
  );
}

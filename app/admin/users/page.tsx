"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import RouteGuard from "@/components/RouteGuard";
import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { UserAvatar } from "@/components/user/UserAvatar";
import type { EquippedRewards } from "@/lib/rewards";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Shield,
  ShieldOff,
  Trash2,
  Search,
  Ban,
  LoaderCircle,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";

type AdminUser = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  equipped_rewards?: EquippedRewards | null;
  role: string;
  banned: boolean;
};

function AdminUsersContent() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const usersQueryKey = ["admin", "users", user?.id] as const;
  const { data: users = [], isPending: loading } = useQuery({
    queryKey: usersQueryKey,
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, equipped_rewards, role, banned")
        .neq("id", user.id)
        .order("username", { ascending: true });

      if (error) throw error;
      return (data || []) as AdminUser[];
    },
    enabled: Boolean(user),
    staleTime: 2 * 60 * 1000,
  });

  async function toggleAdmin(userId: string, currentRole: string) {
    if (userId === user?.id) return;

    const newRole = currentRole === "admin" ? "user" : "admin";

    const { error } = await supabase.rpc("admin_update_user_access", {
      p_user_id: userId,
      p_role: newRole,
      p_banned: null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }

    queryClient.setQueryData<AdminUser[]>(usersQueryKey, (prev = []) =>
      prev.map((u) =>
        u.id === userId ? { ...u, role: newRole } : u
      )
    );
    void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
  }

  async function toggleBan(userId: string, banned: boolean) {
    if (userId === user?.id) return;

    const { error } = await supabase.rpc("admin_update_user_access", {
      p_user_id: userId,
      p_role: null,
      p_banned: !banned,
    });
    if (error) {
      toast.error(error.message);
      return;
    }

    queryClient.setQueryData<AdminUser[]>(usersQueryKey, (prev = []) =>
      prev.map((u) =>
        u.id === userId ? { ...u, banned: !banned } : u
      )
    );
  }

  async function deleteUser(userId: string) {
    if (userId === user?.id || deletingId) return;

    setDeletingId(userId);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw sessionError || new Error(t("admin.users.page.toast.sessionExpired"));
      }

      const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error || t("admin.users.page.toast.deleteError"));
      }

      queryClient.setQueryData<AdminUser[]>(usersQueryKey, (prev = []) =>
        prev.filter((listedUser) => listedUser.id !== userId)
      );
      void queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
      setDeleteId(null);
      toast.success(t("admin.users.page.toast.deleted"));
    } catch (error) {
      toast.error(t("admin.users.page.toast.deleteError"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;

    return users.filter((listedUser) =>
      listedUser.username?.toLowerCase().includes(query)
    );
  }, [search, users]);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full" />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {t("admin.users.page.manageTitle")}
        </h1>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t("admin.users.page.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {users.length} {t("admin.users.page.usersCount")}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">

          {filtered.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between border-b pb-2"
            >
              <Link
                href={`/u/${u.username}`}
                className="flex items-center gap-3 hover:opacity-80"
              >
                <UserAvatar
                  avatarUrl={u.avatar_url}
                  username={u.username}
                  equippedRewards={u.equipped_rewards}
                  className="w-9 h-9"
                />

                <div className="flex flex-col">
                  <p className="font-medium">
                    {u.username}
                  </p>

                  <div className="flex gap-2 text-xs">
                    <Badge variant="secondary">
                      {u.role}
                    </Badge>

                    {u.banned && (
                      <Badge variant="destructive">
                        {t("admin.users.page.badges.banned")}
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>

              <div className="flex items-center gap-2">

                <Button
                  size="sm"
                  variant={u.role === "admin" ? "secondary" : "default"}
                  onClick={() => toggleAdmin(u.id, u.role)}
                  className="flex items-center gap-1"
                >
                  {u.role === "admin" ? (
                    <ShieldOff size={14} />
                  ) : (
                    <Shield size={14} />
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleBan(u.id, u.banned)}
                  className="flex items-center gap-1"
                >
                  <Ban size={14} />
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteId(u.id)}
                  disabled={deletingId === u.id}
                  className="flex items-center gap-1"
                >
                  {deletingId === u.id ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </Button>

              </div>
            </div>
          ))}

        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("admin.users.page.dialog.deleteTitle")}
            </AlertDialogTitle>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>{t("admin.users.page.dialog.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void deleteUser(deleteId!)}
              disabled={Boolean(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingId ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              {deletingId
                ? t("admin.users.page.dialog.deleting")
                : t("admin.users.page.dialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <RouteGuard requireAuth requireAdmin>
      <AdminUsersContent />
    </RouteGuard>
  );
}

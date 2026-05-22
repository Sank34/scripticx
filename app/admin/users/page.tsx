"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import RouteGuard from "@/components/RouteGuard";
import Link from "next/link";

import { useLanguage } from "@/components/LanguageProvider";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

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

function AdminUsersContent() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function fetchUsers() {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, role, banned")
      .order("username", { ascending: true });

    setUsers(data || []);
    setFiltered(data || []);
    setLoading(false);
  }

  async function toggleAdmin(userId: string, currentRole: string) {
    const newRole = currentRole === "admin" ? "user" : "admin";

    await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, role: newRole } : u
      )
    );
  }

  async function toggleBan(userId: string, banned: boolean) {
    await supabase
      .from("profiles")
      .update({ banned: !banned })
      .eq("id", userId);

    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, banned: !banned } : u
      )
    );
  }

  async function deleteUser(userId: string) {
    await supabase.from("profiles").delete().eq("id", userId);

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setDeleteId(null);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();

    setFiltered(
      users.filter((u) =>
        u.username?.toLowerCase().includes(q)
      )
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
            {filtered.length} {t("admin.users.page.usersCount")}
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
                <Avatar className="w-9 h-9">
                  {u.avatar_url && (
                    <AvatarImage src={u.avatar_url} />
                  )}
                  <AvatarFallback>
                    {u.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

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
                  className="flex items-center gap-1"
                >
                  <Trash2 size={14} />
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
              onClick={() => deleteUser(deleteId!)}
              className="bg-red-500 hover:bg-red-600"
            >
              {t("admin.users.page.dialog.confirm")}
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
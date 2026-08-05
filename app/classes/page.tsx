"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

import { Plus, Users, Link as LinkIcon } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

import { useQuery, useQueryClient } from "@tanstack/react-query";

type ClassItem = {
  id: string;
  name: string;
  invite_code: string;
  role: string;
};

export default function ClassesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const [joinCode, setJoinCode] = useState("");

  const { locale } = useLanguage();

  const t = (key: string) => {
    const keys = key.split(".");
    let value: any = translations[locale];
    for (const k of keys) value = value?.[k];
    return value || key;
  };
  
  async function load(): Promise<ClassItem[]> {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return [];

    const { data: memberships } = await supabase
      .from("class_members")
      .select("class_id, role")
      .eq("user_id", user.id);

    const ids = memberships?.map((m) => m.class_id) || [];

    let data: any[] = [];

    if (ids.length) {
      const res = await supabase
        .from("classes")
        .select("*")
        .in("id", ids);

      data = res.data || [];
    }

    const enriched = data.map((cls) => {
      const m = memberships?.find((x) => x.class_id === cls.id);
      return {
        ...cls,
        role: m?.role || "student",
      };
    });

    return enriched;
  }

  const {
    data: classes = [],
    isLoading: loading,
  } = useQuery<ClassItem[]>({
    queryKey: ["classes", user?.id],
    queryFn: load,
    enabled: !!user?.id,
  });

  async function createClass() {
    if (!name.trim()) return;

    const { error } = await supabase.rpc("create_class_secure", {
      p_name: name.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["classes"],
    });
    setOpen(false);
    setName("");
  }

  async function joinClass() {
    if (!joinCode.trim()) return;

    const { error } = await supabase.rpc("join_class_secure", {
      p_invite_code: joinCode.trim(),
    });
    if (error) {
      toast.error(error.message);
      return;
    }

    await queryClient.invalidateQueries({
      queryKey: ["classes"],
    });
    setJoinCode("");
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("classes.title")}</h1>
          <p className="text-muted-foreground">
            {t("classes.subtitle")}
          </p>
        </div>

        <Button onClick={() => setOpen(true)} className="flex gap-2">
          <Plus size={16} />
          {t("classes.createClass")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon size={16} />
            {t("classes.join.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder={t("classes.join.placeholder")}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />
          <Button onClick={joinClass}>{t("classes.join.button")}</Button>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-4" />
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              </CardContent>
            </Card>
          ))}

        {!loading && classes.length === 0 && (
          <p className="text-muted-foreground text-sm">
            {t("classes.noClasses")}
          </p>
        )}

        {classes.map((cls) => (
          <Card
            key={cls.id}
            onClick={() => router.push(`/classes/${cls.id}`)}
            className="hover:scale-[1.02] transition cursor-pointer"
          >
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{cls.name}</h2>
                <Users size={16} />
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-mono">
                  {cls.invite_code}
                </p>
                <span className={`text-[10px] px-2 py-[2px] rounded ${
                  cls.role === "teacher"
                    ? "bg-primary text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {cls.role === "teacher" ? t("classes.roles.teacher") : t("classes.roles.student")}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("classes.dialog.createTitle")}</DialogTitle>
          </DialogHeader>

          <Input
            placeholder={t("classes.dialog.classNamePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <DialogFooter>
            <Button onClick={createClass}>{t("classes.dialog.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

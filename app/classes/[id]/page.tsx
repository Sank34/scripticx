"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import { Users, Plus, Link as LinkIcon } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useAuth } from "@/hooks/useAuth";

type ClassPageData = {
  cls: any;
  members: any[];
  assignments: any[];
  authorized: boolean;
};

export default function ClassPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [openAssignment, setOpenAssignment] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentDeadline, setAssignmentDeadline] = useState("");
  const [selectedProblems, setSelectedProblems] = useState<any[]>([]);
  const [problemQuery, setProblemQuery] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [problemOpen, setProblemOpen] = useState(false);
  const userId = user?.id || null;

  const { locale } = useLanguage();

  const t = (key: string) => {
    const keys = key.split(".");
    let value: any = translations[locale];
    for (const k of keys) value = value?.[k];
    return value || key;
  };

  const classQueryKey = ["classes", "detail", id, userId] as const;
  const { data: classPage, isPending: loading } = useQuery({
    queryKey: classQueryKey,
    queryFn: async (): Promise<ClassPageData> => {
      if (!id || !userId) {
        return { cls: null, members: [], assignments: [], authorized: false };
      }

      const lookupColumn = /^[0-9a-fA-F-]{36}$/.test(id) ? "id" : "invite_code";
      const { data: classData, error: classError } = await supabase
        .from("classes")
        .select("*")
        .eq(lookupColumn, id)
        .maybeSingle();
      if (classError) throw classError;
      if (!classData) {
        return { cls: null, members: [], assignments: [], authorized: true };
      }

      const isTeacher = userId === classData.teacher_id;
      if (!isTeacher) {
        const { data: memberCheck, error: memberError } = await supabase
          .from("class_members")
          .select("user_id")
          .eq("class_id", classData.id)
          .eq("user_id", userId)
          .maybeSingle();
        if (memberError) throw memberError;
        if (!memberCheck) {
          return { cls: classData, members: [], assignments: [], authorized: false };
        }
      }

      const [memberResult, assignmentResult] = await Promise.all([
        supabase
          .from("class_members")
          .select("user_id, role")
          .eq("class_id", classData.id),
        supabase
          .from("assignments")
          .select("*")
          .eq("class_id", classData.id)
          .order("created_at", { ascending: false }),
      ]);
      if (memberResult.error) throw memberResult.error;
      if (assignmentResult.error) throw assignmentResult.error;

      const memberRows = memberResult.data || [];
      const userIds = memberRows.map((member) => member.user_id);
      const { data: profiles, error: profileError } = userIds.length
        ? await supabase
            .from("profiles")
            .select("id, username, avatar_url, equipped_rewards")
            .in("id", userIds)
        : { data: [], error: null };
      if (profileError) throw profileError;

      const profileMap = new Map(
        (profiles || []).map((profile) => [profile.id, profile])
      );
      const members = memberRows.map((member) => ({
        ...(profileMap.get(member.user_id) || {
          id: member.user_id,
          username: "User",
          avatar_url: null,
        }),
        role: member.role,
      }));

      return {
        cls: classData,
        members,
        assignments: assignmentResult.data || [],
        authorized: true,
      };
    },
    enabled: Boolean(id) && !authLoading,
    staleTime: 2 * 60 * 1000,
  });
  const cls = classPage?.cls || null;
  const members = classPage?.members || [];
  const assignments = classPage?.assignments || [];

  useEffect(() => {
    if (classPage && !classPage.authorized) router.replace("/classes");
  }, [classPage, router]);

  const { data: problemCatalog = [] } = useQuery({
    queryKey: ["problems", "assignment-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("problems")
        .select("id, title_i18n");
      if (error) throw error;
      return (data || []).map((problem) => ({
        ...problem,
        title: problem.title_i18n?.en || "Untitled",
      }));
    },
    enabled: problemOpen,
    staleTime: 5 * 60 * 1000,
  });
  const problems = useMemo(() => {
    const query = problemQuery.trim().toLowerCase();
    if (!query) return [];
    return problemCatalog
      .filter((problem) => problem.title.toLowerCase().includes(query))
      .slice(0, 5);
  }, [problemCatalog, problemQuery]);

  async function createAssignment() {
    if (!assignmentTitle.trim() || selectedProblems.length === 0) return;

    const payload: any = {
      class_id: cls?.id,
      title: assignmentTitle,
      description: assignmentDescription,
      deadline: assignmentDeadline || null,
    };

    payload.problem_ids = selectedProblems.map((p) => p.id);

    let { data, error } = await supabase
      .from("assignments")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Assignment insert error (multi):", error);

      const fallbackPayload = {
        ...payload,
        problem_id: selectedProblems[0]?.id || null,
      };

      delete fallbackPayload.problem_ids;

      const res = await supabase
        .from("assignments")
        .insert(fallbackPayload)
        .select()
        .single();

      data = res.data;
      error = res.error;

      if (error) {
        console.error("Assignment insert error (fallback):", error);
        alert("Failed to create assignment. Check console.");
        return;
      }
    }

    if (data) {
      queryClient.setQueryData<ClassPageData>(classQueryKey, (current) =>
        current
          ? { ...current, assignments: [data, ...current.assignments] }
          : current
      );

      if (userId && cls?.id) {
        try {
          await api.notifications.createForNewAssignment({
            actorId: userId,
            assignmentId: data.id,
            assignmentTitle,
            classId: cls.id,
            className: cls.name,
          });
        } catch (notificationError) {
          console.warn(
            "Assignment created, but participant notifications failed.",
            notificationError
          );
        }
      }

      setAssignmentTitle("");
      setAssignmentDescription("");
      setAssignmentDeadline("");
      setOpenAssignment(false);
      setSelectedProblems([]);
    }
  }

  const teacherName =
    members.find((m) => m.role === "teacher")?.username || t("classes.roles.teacher");

  if (loading || (classPage && !classPage.authorized)) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border rounded p-3 flex justify-between items-center">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-6 h-6 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-3 w-12" />
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      <div className="relative rounded-2xl overflow-hidden border bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white p-6 flex items-end justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {cls ? cls.name : t("classes.roles.teacher")}
          </h1>
          <p className="text-sm text-white/70">
            {t("classes.detail.teacherLabel")} {teacherName}
          </p>
          <p className="text-xs text-white/50">
            {t("classes.detail.inviteCodeLabel")}
          </p>
          <div className="inline-block px-3 py-1 rounded-md bg-white/10 backdrop-blur text-sm font-mono">
            {cls?.invite_code || "—"}
          </div>
        </div>

        <div className="flex gap-2">
          {userId && cls?.teacher_id === userId && (
            <Button
              onClick={() => setOpenAssignment(true)}
              className="bg-white text-black hover:bg-white/90 dark:!bg-white dark:!text-black dark:hover:!bg-white/90"
            >
              <Plus size={16} />
              {t("classes.detail.newAssignment")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 space-y-4">

          <Card>
            <CardHeader>
              <CardTitle>
                {userId && cls?.teacher_id === userId
                  ? t("classes.detail.assignments.titleTeacher")
                  : t("classes.detail.assignments.titleStudent")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {assignments.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {userId && cls?.teacher_id === userId
                    ? t("classes.detail.assignments.emptyTeacher")
                    : t("classes.detail.assignments.emptyStudent")}
                </p>
              )}

              {assignments.map((a) => (
                <div key={a.id} className="border rounded p-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.deadline ? new Date(a.deadline).toLocaleString() : t("classes.detail.assignments.noDeadline")}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() =>
                      router.push(`/classes/${cls?.id}/assignments/${a.id}`)
                    }
                  >
                    {t("classes.detail.assignments.open")}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={16} /> {t("classes.detail.members")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-80 overflow-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <UserAvatar
                      avatarUrl={m.avatar_url}
                      username={m.username}
                      equippedRewards={m.equipped_rewards}
                      className="w-6 h-6"
                    />
                    <span>{m.username}</span>
                  </div>

                  <span className="text-xs text-muted-foreground">{m.role}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon size={16} /> {t("classes.detail.invite.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t("classes.detail.invite.shareText")}
              </p>
              <div className="mt-2 font-mono text-sm bg-muted p-2 rounded">
                {cls?.invite_code || "—"}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      <Dialog open={openAssignment} onOpenChange={setOpenAssignment}>
        <DialogContent className="overflow-visible">
          <DialogHeader>
            <DialogTitle>{t("classes.detail.createAssignment.title")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Popover open={problemOpen} onOpenChange={setProblemOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between rounded-lg h-11 text-sm font-medium"
                >
                  {selectedProblems.length > 0 ? (
                    <span className="truncate">
                      {selectedProblems.length}{" "}
                      {selectedProblems.length > 1
                        ? t("classes.detail.createAssignment.problemsSelected")
                        : t("classes.detail.createAssignment.problemSelected")}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("classes.detail.createAssignment.selectProblem")}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-lg shadow-lg border">
                <Command className="pt-1" loop>
                  <CommandInput
                    placeholder={t("classes.detail.createAssignment.searchProblem")}
                    value={problemQuery}
                    className="h-10 text-sm"
                    onValueChange={(value) => {
                      setProblemQuery(value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && problems.length > 0) {
                        const p = problems[0];
                        setSelectedProblems((prev) => {
                          if (prev.find((x) => x.id === p.id)) return prev;
                          return [...prev, p];
                        });
                        setProblemQuery("");
                        setProblemOpen(false);
                        setAssignmentTitle(p.title);
                      }
                    }}
                  />

                  <CommandList className="mt-1">
                    <CommandEmpty>{t("classes.detail.createAssignment.noProblemsFound")}</CommandEmpty>

                    {problems.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={p.title}
                        className="text-sm cursor-pointer aria-selected:bg-muted"
                        onSelect={() => {
                          setSelectedProblems((prev) => {
                            if (prev.find((x) => x.id === p.id)) return prev;
                            return [...prev, p];
                          });
                          setProblemQuery("");
                          setProblemOpen(false);
                          setAssignmentTitle(p.title);
                        }}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{p.title}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {selectedProblems.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedProblems.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm border"
                  >
                    <span className="truncate max-w-[140px]">{p.title}</span>
                    <button
                      className="text-xs opacity-70 hover:opacity-100"
                      onClick={() =>
                        setSelectedProblems((prev) => prev.filter((x) => x.id !== p.id))
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Input
              placeholder={t("classes.detail.createAssignment.titlePlaceholder")}
              value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)}
            />

            <Input
              placeholder={t("classes.detail.createAssignment.descriptionPlaceholder")}
              value={assignmentDescription}
              onChange={(e) => setAssignmentDescription(e.target.value)}
            />

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  {assignmentDeadline
                    ? format(new Date(assignmentDeadline), "PPP")
                    : t("classes.detail.createAssignment.pickDeadline")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={assignmentDeadline ? new Date(assignmentDeadline) : undefined}
                  disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  onSelect={(date) => {
                    if (date) {
                      setAssignmentDeadline(date.toISOString());
                      setCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <DialogFooter>
            <Button onClick={createAssignment}>{t("classes.detail.createAssignment.create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

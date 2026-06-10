"use client";

import { useEffect, useState } from "react";
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

export default function ClassPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const [cls, setCls] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");

  const [openAssignment, setOpenAssignment] = useState(false);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [assignmentDescription, setAssignmentDescription] = useState("");
  const [assignmentDeadline, setAssignmentDeadline] = useState("");
  const [selectedProblems, setSelectedProblems] = useState<any[]>([]);
  const [problemQuery, setProblemQuery] = useState("");
  const [problems, setProblems] = useState<any[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [problemOpen, setProblemOpen] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);

  const { locale } = useLanguage();

  const t = (key: string) => {
    const keys = key.split(".");
    let value: any = translations[locale];
    for (const k of keys) value = value?.[k];
    return value || key;
  };

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    if (!id) return;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (user) setUserId(user.id);

    let classData = null;
    let classError = null;

    const isUUID = /^[0-9a-fA-F-]{36}$/.test(id || "");

    if (isUUID) {
      const res = await supabase
        .from("classes")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      classData = res.data;
      classError = res.error;
    } else {
      const res = await supabase
        .from("classes")
        .select("*")
        .eq("invite_code", id)
        .maybeSingle();

      classData = res.data;
      classError = res.error;
    }

    if (classData) setCls(classData);

    const isTeacher = user?.id === classData?.teacher_id;

    const { data: memberCheck } = await supabase
      .from("class_members")
      .select("user_id")
      .eq("class_id", classData?.id)
      .eq("user_id", user?.id)
      .maybeSingle();

    const isMember = !!memberCheck;

    if (!isTeacher && !isMember) {
      router.push("/classes");
      return;
    }

    const { data: memberRows } = await supabase
      .from("class_members")
      .select("user_id, role")
      .eq("class_id", classData?.id);

    if (!memberRows || memberRows.length === 0) {
      setMembers([]);
    } else {
      const userIds = memberRows.map((m) => m.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds);

      const profileMap: any = {};
      (profiles || []).forEach((p) => {
        profileMap[p.id] = p;
      });

      const merged = memberRows.map((m) => ({
        ...(profileMap[m.user_id] || {
          id: m.user_id,
          username: "User",
          avatar_url: null,
        }),
        role: m.role,
      }));

      setMembers(merged);
    }

    const { data: sessionData } = await supabase
      .from("class_sessions")
      .select("*")
      .eq("class_id", classData?.id)
      .order("created_at", { ascending: false });

    setSessions(sessionData || []);

    const { data: assignmentData } = await supabase
      .from("assignments")
      .select("*")
      .eq("class_id", classData?.id)
      .order("created_at", { ascending: false });

    setAssignments(assignmentData || []);
    setLoading(false);
  }

  async function createSession() {
    if (!sessionName.trim()) return;

    const { data } = await supabase
      .from("class_sessions")
      .insert({
        class_id: cls?.id,
        title: sessionName,
        status: "active",
      })
      .select()
      .single();

    if (data) {
      setSessions((prev) => [data, ...prev]);
      setSessionName("");
      setOpen(false);
    }
  }

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
      setAssignments((prev) => [data, ...prev]);

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

  async function fetchProblems(query: string) {
    if (!query.trim()) {
      setProblems([]);
      return;
    }

    const { data } = await supabase
      .from("problems")
      .select("*");

    if (!data) {
      setProblems([]);
      return;
    }

    const filtered = data
      .map((p: any) => ({
        ...p,
        title: p.title_i18n?.en || "Untitled",
      }))
      .filter((p: any) =>
        p.title.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5);

    setProblems(filtered);
  }

  const teacherName =
    members.find((m) => m.role === "teacher")?.username || t("classes.roles.teacher");

  if (loading) {
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
              className="bg-white text-black hover:bg-white/90"
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
                    {m.avatar_url ? (
                      <img src={m.avatar_url} className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                        {m.username?.[0]?.toUpperCase()}
                      </div>
                    )}
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
                      fetchProblems(value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && problems.length > 0) {
                        const p = problems[0];
                        setSelectedProblems((prev) => {
                          if (prev.find((x) => x.id === p.id)) return prev;
                          return [...prev, p];
                        });
                        setProblemQuery("");
                        setProblems([]);
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
                          setProblems([]);
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

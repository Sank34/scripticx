"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  Bell,
  Compass,
  MailPlus,
  Plus,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { api, type StudyGroup, type StudyGroupsData } from "@/lib/api";
import { useLanguage } from "@/components/LanguageProvider";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { GroupCard } from "@/components/groups/GroupCard";
import { useGroupActivity } from "@/hooks/useGroupActivity";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type GroupsDirectoryProps = {
  initialData?: StudyGroupsData;
};

export function GroupsDirectory({ initialData }: GroupsDirectoryProps) {
  const { t, locale } = useLanguage();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [saving, setSaving] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<StudyGroupsData>({
    queryKey: ["groups"],
    queryFn: () => api.groups.getGroupsData(),
    initialData,
  });

  const userId = data?.userId || null;
  const myGroups = data?.myGroups || [];
  const invitedGroups = myGroups.filter((group) => group.status === "invited");
  const activeGroups = myGroups.filter((group) => group.status !== "invited");
  const publicGroups = data?.publicGroups || [];
  const publicWithoutMine = publicGroups.filter(
    (group) => !myGroups.some((mine) => mine.id === group.id)
  );
  const groupActivity = useGroupActivity(userId);
  const unreadMentions = Array.from(
    groupActivity.mentionCountsByGroup.values()
  ).reduce((total, count) => total + count, 0);
  const activeWithActivity = activeGroups.filter((group) =>
    groupActivity.activityGroupIds.has(group.id)
  ).length;

  const sortedActiveGroups = useMemo(() => {
    return [...activeGroups].sort((a, b) => {
      const aMentions = groupActivity.mentionCountsByGroup.get(a.id) || 0;
      const bMentions = groupActivity.mentionCountsByGroup.get(b.id) || 0;

      if (aMentions !== bMentions) return bMentions - aMentions;

      const aActivity = groupActivity.activityGroupIds.has(a.id) ? 1 : 0;
      const bActivity = groupActivity.activityGroupIds.has(b.id) ? 1 : 0;

      if (aActivity !== bActivity) return bActivity - aActivity;

      return 0;
    });
  }, [
    activeGroups,
    groupActivity.activityGroupIds,
    groupActivity.mentionCountsByGroup,
  ]);

  const filteredPublicGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return publicWithoutMine;

    return publicWithoutMine.filter((group) =>
      `${group.name} ${group.description || ""}`.toLowerCase().includes(q)
    );
  }, [publicWithoutMine, query]);

  async function createGroup() {
    if (!userId || !name.trim() || saving) return;

    setSaving(true);

    try {
      await api.groups.createGroup({
        ownerId: userId,
        name,
        description,
        visibility,
      });

      toast.success(t("groups.toasts.created"));
      setOpen(false);
      setName("");
      setDescription("");
      setVisibility("public");
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    } catch (error) {
      console.error("Could not create group:", error);
      toast.error(t("groups.toasts.createFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function joinGroup(group: StudyGroup) {
    if (!userId || joiningId) return;

    setJoiningId(group.id);

    try {
      const status = await api.groups.joinGroup(
        group.id,
        userId,
        group.visibility,
        locale
      );

      toast.success(
        status === "pending"
          ? t("groups.toasts.requested")
          : t("groups.toasts.joined")
      );
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
    } catch (error) {
      console.error("Could not join group:", error);
      toast.error(t("groups.toasts.joinFailed"));
    } finally {
      setJoiningId(null);
    }
  }

  const labels = {
    joinLabel: t("groups.actions.join"),
    memberLabel: t("groups.member"),
    pendingLabel: t("groups.pending"),
    invitedLabel: t("groups.invited"),
    acceptInviteLabel: t("groups.actions.acceptInvite"),
    privateLabel: t("groups.private"),
    publicLabel: t("groups.public"),
    openLabel: t("groups.actions.open"),
    mentionLabel: t("groups.activity.ping"),
    activityLabel: t("groups.activity.newActivity"),
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
      <div className="overflow-hidden rounded-[2rem] border bg-background shadow-sm">
        <div className="relative border-b bg-[linear-gradient(135deg,#fafafa_0%,#ecfdf5_52%,#f4f4f5_100%)] p-6 sm:p-8 dark:bg-[linear-gradient(135deg,#18181b_0%,#12332b_52%,#27272a_100%)]">
          <div className="absolute right-8 top-8 hidden size-32 rounded-full bg-emerald-200/40 blur-3xl md:block" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <PageHeader
              title={t("groups.title")}
              subtitle={t("groups.subtitle")}
            />

            <div className="flex flex-wrap gap-2">
              {userId ? (
                <Button onClick={() => setOpen(true)} className="gap-2">
                  <Plus className="size-4" />
                  {t("groups.actions.create")}
                </Button>
              ) : null}
              <Button
                variant="outline"
                className="gap-2 bg-background/80"
                onClick={() => {
                  document
                    .getElementById("groups-discover")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <Compass className="size-4" />
                {t("groups.actions.discover")}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid divide-y md:grid-cols-4 md:divide-x md:divide-y-0">
          <div className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="size-4" />
              {t("groups.stats.mine")}
            </div>
            <p className="mt-3 text-3xl font-semibold">{activeGroups.length}</p>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MailPlus className="size-4" />
              {t("groups.stats.invites")}
            </div>
            <p className="mt-3 text-3xl font-semibold">{invitedGroups.length}</p>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="size-4" />
              {t("groups.stats.pings")}
            </div>
            <p className="mt-3 text-3xl font-semibold">{unreadMentions}</p>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4" />
              {t("groups.stats.activity")}
            </div>
            <p className="mt-3 text-3xl font-semibold">{activeWithActivity}</p>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        {invitedGroups.length ? (
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-50/60 p-4 sm:p-5 dark:bg-emerald-950/25">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                <MailPlus className="size-4" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    {t("groups.sections.invites")}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t("groups.sections.invitesHint")}
                  </p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm dark:text-emerald-300">
                {invitedGroups.length} {t("groups.sections.pendingInvites")}
                <ArrowRight className="size-3.5" />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {invitedGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  {...labels}
                  onJoin={joinGroup}
                />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{t("groups.sections.mine")}</h2>
            <p className="text-sm text-muted-foreground">
              {t("groups.sections.mineHint")}
            </p>
          </div>
        </div>
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        ) : sortedActiveGroups.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sortedActiveGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                mentionCount={
                  groupActivity.mentionCountsByGroup.get(group.id) || 0
                }
                hasActivity={groupActivity.activityGroupIds.has(group.id)}
                {...labels}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            className="rounded-xl border py-10"
            title={t("groups.empty.mineTitle")}
            description={t("groups.empty.mineDescription")}
          />
        )}
      </section>

      <section id="groups-discover" className="scroll-mt-24 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">
              {t("groups.sections.discover")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("groups.sections.discoverHint")}
            </p>
          </div>
          <div className="relative sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("groups.searchPlaceholder")}
              className="pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        ) : filteredPublicGroups.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredPublicGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                {...labels}
                onJoin={joinGroup}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            className="rounded-xl border py-10"
            title={t("groups.empty.discoverTitle")}
            description={t("groups.empty.discoverDescription")}
          />
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("groups.dialog.title")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("groups.dialog.name")}
            />
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("groups.dialog.description")}
              className="min-h-24 resize-none"
            />
            <Select
              value={visibility}
              onValueChange={(value) =>
                setVisibility(value === "private" ? "private" : "public")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">{t("groups.public")}</SelectItem>
                <SelectItem value="private">{t("groups.private")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              onClick={createGroup}
              disabled={!name.trim() || saving}
            >
              {saving ? t("groups.actions.creating") : t("groups.actions.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

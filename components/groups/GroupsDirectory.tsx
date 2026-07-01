"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, MailPlus, Plus, Search, Users } from "lucide-react";
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
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <PageHeader
        title={t("groups.title")}
        subtitle={t("groups.subtitle")}
        action={
          userId ? (
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="size-4" />
              {t("groups.actions.create")}
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="size-4" />
            {t("groups.stats.mine")}
          </div>
          <p className="mt-3 text-3xl font-semibold">{myGroups.length}</p>
        </div>
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Hash className="size-4" />
            {t("groups.stats.public")}
          </div>
          <p className="mt-3 text-3xl font-semibold">{publicGroups.length}</p>
        </div>
        <div className="rounded-xl border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="size-4" />
            {t("groups.stats.discovery")}
          </div>
          <p className="mt-3 text-3xl font-semibold">
            {filteredPublicGroups.length}
          </p>
        </div>
      </div>

      <section className="space-y-3">
        {invitedGroups.length ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-600 text-white">
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
        <h2 className="text-lg font-semibold">{t("groups.sections.mine")}</h2>
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

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">
            {t("groups.sections.discover")}
          </h2>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("groups.searchPlaceholder")}
            className="sm:max-w-xs"
          />
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

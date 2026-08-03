"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, Lock, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";

import { api, type StudyGroupInvitePreview } from "@/lib/api";
import { useLanguage } from "@/components/LanguageProvider";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

type GroupInviteLandingProps = {
  token: string;
};

export function GroupInviteLanding({ token }: GroupInviteLandingProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [joining, setJoining] = useState(false);

  const inviteQuery = useQuery<StudyGroupInvitePreview>({
    queryKey: ["group-invite", token],
    queryFn: () => api.groups.getInvitePreview(token),
  });

  const preview = inviteQuery.data;
  const group = preview?.group || null;
  const membership = preview?.membership || null;
  const activeMember = membership?.status === "active";
  const groupInitial = group?.name?.charAt(0).toUpperCase() || "S";

  async function acceptInvite() {
    if (!preview?.userId) {
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    if (!group || joining) return;

    setJoining(true);

    try {
      const result = await api.groups.acceptInviteLink(token);
      toast.success(t("groups.toasts.joined"));
      await queryClient.invalidateQueries({ queryKey: ["groups"] });
      router.push(`/groups/${result?.slug || group.slug}`);
    } catch (error) {
      console.error("Could not accept invite link:", error);
      toast.error(t("groups.toasts.joinFailed"));
    } finally {
      setJoining(false);
    }
  }

  if (inviteQuery.isLoading) {
    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_#d1fae5,_transparent_34%),#fafafa] p-6">
        <div className="w-full max-w-xl rounded-3xl border bg-white/85 p-8 shadow-2xl shadow-emerald-950/10 backdrop-blur">
          <Skeleton className="mx-auto size-16 rounded-2xl" />
          <Skeleton className="mx-auto mt-6 h-8 w-2/3" />
          <Skeleton className="mx-auto mt-3 h-4 w-5/6" />
          <Skeleton className="mt-8 h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!group || preview?.expired || preview?.full) {
    const title = preview?.expired
      ? t("groups.invitePage.expiredTitle")
      : preview?.full
        ? t("groups.invitePage.fullTitle")
        : t("groups.invitePage.unavailableTitle");
    const description = preview?.expired
      ? t("groups.invitePage.expiredDescription")
      : preview?.full
        ? t("groups.invitePage.fullDescription")
        : t("groups.invitePage.unavailableDescription");

    return (
      <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-zinc-50 p-6">
        <EmptyState
          className="w-full max-w-xl rounded-3xl border bg-white p-10 shadow-xl"
          icon={<Lock className="size-8" />}
          title={title}
          description={description}
          action={
            <Button asChild>
              <Link href="/groups">{t("groups.actions.back")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#f8fafc_0%,#ecfdf5_45%,#ffffff_100%)] p-6">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border bg-white/90 text-center shadow-2xl shadow-emerald-950/10 backdrop-blur">
        <div
          className="h-28 border-b bg-[linear-gradient(135deg,#f8fafc_0%,#e7fff5_42%,#eef2ff_100%)] bg-cover bg-center"
          style={
            group.banner_url
              ? {
                  backgroundImage: `url("${group.banner_url}")`,
                }
              : undefined
          }
        />
        <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 size-56 rounded-full bg-zinc-200/60 blur-3xl" />

        <div className="relative px-8 pb-8">
          <Avatar className="mx-auto -mt-10 size-20 border-4 border-background shadow-lg">
            <AvatarImage src={group.avatar_url || undefined} alt={group.name} />
            <AvatarFallback className="bg-zinc-950 text-2xl font-semibold text-white">
              {groupInitial}
            </AvatarFallback>
          </Avatar>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700">
            {t("groups.invitePage.eyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("groups.invitePage.title")}
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            {t("groups.invitePage.subtitle")}
          </p>

          <div className="mt-8 rounded-2xl border bg-white p-5 text-left shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-2xl font-semibold">
                    {group.name}
                  </h2>
                  <Badge variant="secondary">
                    {group.visibility === "private"
                      ? t("groups.private")
                      : t("groups.public")}
                  </Badge>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {group.description || t("groups.workspace.noDescription")}
                </p>
              </div>
              <div className="flex shrink-0 gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1">
                  <Users className="size-4" />
                  {preview?.memberCount || 0} {t("groups.invitePage.members")}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1">
                  <Hash className="size-4" />
                  {preview?.channelCount || 0} {t("groups.invitePage.channels")}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {activeMember ? (
              <Button asChild size="lg" className="rounded-full px-8">
                <Link href={`/groups/${group.slug}`}>
                  {t("groups.invitePage.open")}
                </Link>
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={acceptInvite}
                disabled={joining}
                className="rounded-full px-8"
              >
                {joining
                  ? t("groups.invitePage.joining")
                  : preview?.userId
                    ? t("groups.invitePage.join")
                    : t("groups.invitePage.login")}
              </Button>
            )}
            <Button asChild size="lg" variant="outline" className="rounded-full px-8">
              <Link href="/groups">{t("groups.actions.back")}</Link>
            </Button>
          </div>

          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-emerald-600" />
            {activeMember
              ? t("groups.invitePage.alreadyMember")
              : t("groups.invitePage.invitedHint")}
          </p>
        </div>
      </div>
    </div>
  );
}

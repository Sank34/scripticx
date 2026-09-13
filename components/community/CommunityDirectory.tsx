"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import type { CommunityProfile } from "@/lib/community";
import { fetchCommunityProfiles } from "@/lib/community";
import { UserAvatar } from "@/components/user/UserAvatar";

type CommunityDirectoryProps = {
  initialProfiles: CommunityProfile[];
};

export function CommunityDirectory({
  initialProfiles,
}: CommunityDirectoryProps) {
  const { t } = useLanguage();
  const { data: profiles = initialProfiles } = useQuery({
    queryKey: ["community"],
    queryFn: fetchCommunityProfiles,
    initialData: initialProfiles,
  });

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 p-6 md:p-10">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="size-4" />
          <span>
            {t("community.publicProfiles").replace(
              "{count}",
              String(profiles.length)
            )}
          </span>
        </div>
        <h1 className="text-3xl font-bold">{t("community.title")}</h1>
        <p className="max-w-2xl text-muted-foreground">
          {t("community.description")}
        </p>
      </header>

      {profiles.length > 0 ? (
        <section
          aria-label={t("community.sectionLabel")}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {profiles.map((profile) => {
            const profileHref = `/u/${encodeURIComponent(profile.username)}`;
            return (
              <Link
                key={profile.username}
                href={profileHref}
                className="flex min-w-0 items-center gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <UserAvatar
                  avatarUrl={profile.avatar_url}
                  username={profile.username}
                  equippedRewards={profile.equipped_rewards}
                  className="size-11 border"
                />

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {profile.username}
                  </span>
                  <span className="block truncate text-sm text-muted-foreground">
                    {profile.bio || t("community.memberFallback")}
                  </span>
                </span>

                <span className="shrink-0 text-xs text-muted-foreground">
                  {profile.total_score || 0} {t("community.points")}
                </span>
              </Link>
            );
          })}
        </section>
      ) : (
        <p className="rounded-lg border p-6 text-muted-foreground">
          {t("community.empty")}
        </p>
      )}
    </main>
  );
}

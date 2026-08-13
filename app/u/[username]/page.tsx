import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer";
import PublicProfileHeader from "@/components/PublicProfileHeader";
import { StatCard } from "@/components/common/StatCard";
import { AchievementBadgeCard } from "@/components/achievements/AchievementBadgeCard";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { Award, Flame, Globe } from "lucide-react";
import { siGithub, siX } from "simple-icons";

import { getLocalized } from "@/lib/getLocalized";
import { translations } from "@/lib/i18n";
import { ProfileImagePreview } from "@/components/user/ProfileImagePreview";
import { ProfileBackground } from "@/components/user/ProfileBackground";
import { ContributionHeatmap } from "@/components/profile/ContributionHeatmap";
import {
  getLegacyBadgeRarity,
  resolveEquippedReward,
  type EquippedRewards,
  type RewardRarity,
} from "@/lib/rewards";
import {
  absoluteUrl,
  createNotFoundMetadata,
  createPageMetadata,
  metadataExcerpt,
  siteConfig,
} from "@/lib/metadata";
import {
  buildSubmissionActivityHeatmap,
  buildSubmissionActivityHeatmapFromDailyRows,
  type SubmissionActivityAggregateRow,
} from "@/lib/submissionActivity";

function BrandIcon({ icon }: { icon: any }) {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d={icon.path} />
    </svg>
  );
}

function normalizeUrl(url: string) {
  if (!url) return "";
  if (!url.startsWith("http")) return "https://" + url;
  return url;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const supabase = createServerSupabase();

  const resolvedParams = await params;
  const username = resolvedParams.username;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return createNotFoundMetadata("Profile");

  const title = `${profile.username} (@${profile.username}) — Programming Profile`;

  return createPageMetadata({
    title,
    description: metadataExcerpt(
      profile.bio,
      `Explore ${profile.username}'s ScripticX profile, including progress, solved problems, achievements, and community activity.`
    ),
    path: `/u/${encodeURIComponent(profile.username)}`,
    image: profile.banner_url || profile.avatar_url || null,
    type: "profile",
    keywords: [
      profile.username,
      `${profile.username} ScripticX`,
      "programming profile",
      "ScripticX community",
    ],
  });
}

export default async function PublicProfile({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const supabase = createServerSupabase();

  const cookieStore = await cookies();
  const locale = (cookieStore.get("locale")?.value as "en" | "ro") || "en";
  const t = (key: string) => {
    const keys = key.split(".");
    let value: any = translations[locale];
    for (const k of keys) value = value?.[k];
    return value || key;
  };

  const { username } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const emptyActivity = buildSubmissionActivityHeatmap([], {
    timeZone: "UTC",
  });
  const [submissionResult, activityResult, achievementResult, postResult] =
    await Promise.all([
      supabase
        .from("submissions")
        .select(`
          id,
          user_id,
          problem_id,
          score,
          created_at,
          verified_at,
          problems (
            title_i18n,
            difficulty
          )
        `)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase.rpc("get_profile_submission_activity", {
        p_user_id: profile.id,
        p_start_date: emptyActivity.startDate,
        p_end_date: emptyActivity.endDate,
      }),
      supabase
        .from("user_achievements")
        .select(`
          achievement:achievements (
            *
          )
        `)
        .eq("user_id", profile.id),
      supabase
        .from("posts")
        .select("id, content, image_url, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);
  const submissions = submissionResult.data;
  const achievements = achievementResult.data;
  const posts = postResult.data;
  const fallbackActivity = buildSubmissionActivityHeatmap(
    (submissions || []).filter((submission) =>
      Boolean(submission.verified_at)
    ),
    { endDate: emptyActivity.endDate, timeZone: "UTC" }
  );
  const activity = activityResult.error
    ? fallbackActivity
    : buildSubmissionActivityHeatmapFromDailyRows(
        (activityResult.data || []) as SubmissionActivityAggregateRow[],
        { endDate: emptyActivity.endDate, timeZone: "UTC" }
      );

  const best: Record<string, any> = {};
  const days = new Set<string>();

  submissions?.forEach((sub) => {
    const day = new Date(sub.created_at).toDateString();
    days.add(day);

    if (!best[sub.problem_id] || sub.score > best[sub.problem_id].score) {
      best[sub.problem_id] = sub;
    }
  });

  const scores = Object.values(best).map((s: any) => s.score);

  const solved = scores.filter((s) => s === 100).length;
  const average =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  const sortedDays = Array.from(days)
    .map((d) => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  for (let i = 0; i < sortedDays.length; i++) {
    const diff =
      (sortedDays[i].getTime() -
        (sortedDays[i + 1]?.getTime() || sortedDays[i].getTime())) /
      (1000 * 60 * 60 * 24);

    if (i === 0 || diff === 1) streak++;
    else break;
  }

  const initial = (profile.username || "U")[0]?.toUpperCase();
  const equippedRewards = (profile.equipped_rewards || {}) as EquippedRewards;
  const backgroundReward =
    equippedRewards["profile-background"] || equippedRewards["profile-banner"];
  const titleReward = resolveEquippedReward(equippedRewards["profile-title"]);
  const equippedTitle = titleReward?.name?.[locale];
  const profileUrl = absoluteUrl(
    `/u/${encodeURIComponent(profile.username)}`
  );
  const sameAs = [profile.github, profile.twitter, profile.website]
    .filter((value): value is string => Boolean(value))
    .map(normalizeUrl);
  const profileJsonLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${profileUrl}#profile-page`,
    url: profileUrl,
    name: `${profile.username} on ${siteConfig.name}`,
    description: metadataExcerpt(
      profile.bio,
      `${profile.username}'s public profile in the ScripticX programming community.`
    ),
    inLanguage: "en",
    isPartOf: {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      name: siteConfig.name,
      url: siteConfig.url,
    },
    mainEntity: {
      "@type": "Person",
      "@id": `${profileUrl}#person`,
      name: profile.username,
      identifier: profile.username,
      url: profileUrl,
      image: profile.avatar_url || undefined,
      description: profile.bio || undefined,
      sameAs: sameAs.length > 0 ? sameAs : undefined,
      memberOf: {
        "@type": "Organization",
        name: siteConfig.name,
        url: siteConfig.url,
      },
    },
  };

  return (
    <div className="relative isolate min-h-full w-full overflow-hidden bg-background pb-16 md:pb-0">
      {backgroundReward && <ProfileBackground reward={backgroundReward} />}
      <div className="relative z-[1] mx-auto max-w-5xl space-y-6 p-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(profileJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="overflow-hidden rounded-3xl border bg-card/95 shadow-sm supports-[backdrop-filter]:backdrop-blur-sm">
        <div
          className="relative h-44 bg-muted bg-cover bg-center sm:h-52"
          style={
            profile.banner_url
              ? {
                  backgroundImage: `url("${profile.banner_url}")`,
                }
              : undefined
          }
        >
          {profile.banner_url && (
            <div className="absolute inset-0 bg-transparent transition-colors duration-300 dark:bg-background/55" />
          )}
          <div className="absolute inset-x-0 bottom-0 h-px bg-border" />
        </div>

        <div className="px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <ProfileImagePreview
                alt={`${profile.username} profile picture`}
                avatarUrl={profile.avatar_url}
                equippedRewards={equippedRewards}
                className="h-20 w-20 border border-border shadow-sm sm:h-24 sm:w-24"
                fallback={initial}
              />

              <div className="min-w-0 pb-1">
                <h1 className="truncate text-3xl font-bold">
                  {profile.username}
                </h1>
                {equippedTitle && (
                  <Badge variant="outline" className="mt-1.5 bg-background">
                    {equippedTitle}
                  </Badge>
                )}
                <PublicProfileHeader
                  profileId={profile.id}
                  profileUsername={profile.username}
                />
              </div>
            </div>
          </div>

          {profile.bio && (
            <p className="mt-4 max-w-2xl text-sm text-muted-foreground">
              {profile.bio}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {profile.github && (
              <a href={normalizeUrl(profile.github)} target="_blank" rel="noopener noreferrer">
                <span className="flex items-center gap-1">
                  <BrandIcon icon={siGithub} />
                  GitHub
                </span>
              </a>
            )}

            {profile.twitter && (
              <a href={normalizeUrl(profile.twitter)} target="_blank" rel="noopener noreferrer">
                <span className="flex items-center gap-1">
                  <BrandIcon icon={siX} />
                  X
                </span>
              </a>
            )}

            {profile.website && (
              <a href={normalizeUrl(profile.website)} target="_blank" rel="noopener noreferrer">
                <span className="flex items-center gap-1">
                  <Globe size={16} />
                  Website
                </span>
              </a>
            )}
          </div>
        </div>
      </div>

      <ContributionHeatmap data={activity} locale={locale} />

      <div className="grid grid-cols-3 gap-4">

        <StatCard
          title={t("publicProfile.stats.solved")}
          value={solved}
        />

        <StatCard
          title={t("publicProfile.stats.average")}
          value={`${average}%`}
        />

        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          title={t("publicProfile.stats.streak")}
          value={streak}
        />

      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t("publicProfile.achievements")}</CardTitle>
          <Badge variant="secondary">{achievements?.length || 0}</Badge>
        </CardHeader>
        <CardContent>
          {achievements?.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {achievements.map((item: any, index: number) => {
                const achievement = item.achievement;
                if (!achievement) return null;

                return (
                  <AchievementBadgeCard
                    key={`${achievement.title}-${index}`}
                    compact
                    title={achievement.title}
                    iconName={achievement.icon}
                    iconUrl={achievement.icon_url}
                    rarity={(achievement.rarity || getLegacyBadgeRarity(achievement.icon)) as RewardRarity}
                    description={achievement.description || (
                      locale === "ro" ? "Badge obținut pe ScripticX." : "Badge earned on ScripticX."
                    )}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/40 px-4 py-10 text-center">
              <Award className="size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm font-medium">
                {locale === "ro" ? "Nu există badge-uri încă." : "No badges yet."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("publicProfile.posts.title")}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {posts?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("publicProfile.posts.empty")}
            </p>
          )}

          {posts?.map((p: any) => (
            <a key={p.id} href={`/post/${p.id}`} className="block mb-3 last:mb-0">
              <div className="p-3 border rounded hover:bg-muted/50 transition cursor-pointer">
                <p className="text-sm line-clamp-2">
                  {p.content}
                </p>

                {p.image_url && (
                  <img
                    src={p.image_url}
                    alt={`Imagine din postarea publicată de ${profile.username}`}
                    className="mt-2 rounded max-h-[120px] w-full object-cover"
                  />
                )}

                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(p.created_at).toLocaleDateString()}
                </p>
              </div>
            </a>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("publicProfile.submissions.title")}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {submissions?.slice(0, 5).map((r: any, i: number) => (
            <div key={i} className="flex justify-between items-center border-b pb-2">
              <div>
                <p className="font-medium">
                  {getLocalized(r.problems?.title_i18n, locale)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </p>
              </div>

              <Badge>{r.score}%</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

    </div>
    </div>
  );
}

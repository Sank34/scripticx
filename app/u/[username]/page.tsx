import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabaseServer";
import PublicProfileHeader from "@/components/PublicProfileHeader";
import { StatCard } from "@/components/common/StatCard";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import { Flame, Globe, Trophy, Check, Rocket, Brain } from "lucide-react";
import { siGithub, siX } from "simple-icons";

import { getLocalized } from "@/lib/getLocalized";
import { translations } from "@/lib/i18n";
import { ProfileImagePreview } from "@/components/user/ProfileImagePreview";
import {
  absoluteUrl,
  createNotFoundMetadata,
  createPageMetadata,
  metadataExcerpt,
  siteConfig,
} from "@/lib/metadata";

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
    .select("username, bio, avatar_url, github, twitter, website")
    .eq("username", username)
    .maybeSingle();

  if (!profile) return createNotFoundMetadata("Profilul");

  const title = `${profile.username} (@${profile.username}) — profil de programare`;

  return createPageMetadata({
    title,
    description: metadataExcerpt(
      profile.bio,
      `Descoperă profilul lui ${profile.username} pe ScripticX: progres, probleme rezolvate, realizări și activitate în comunitatea de programare.`
    ),
    path: `/u/${encodeURIComponent(profile.username)}`,
    image: profile.avatar_url || null,
    type: "profile",
    keywords: [
      profile.username,
      `${profile.username} ScripticX`,
      "profil programator",
      "comunitate ScripticX",
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

  const { data: submissions } = await supabase
    .from("submissions")
    .select(`
      *,
      problems (
        title_i18n,
        difficulty
      )
    `)
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: achievements } = await supabase
    .from("user_achievements")
    .select(`
      achievement:achievements (
        title,
        icon
      )
    `)
    .eq("user_id", profile.id);

  const { data: posts } = await supabase
    .from("posts")
    .select("id, content, image_url, created_at")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const iconMap: any = {
    trophy: Trophy,
    flame: Flame,
    check: Check,
    rocket: Rocket,
    brain: Brain,
  };

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
    name: `${profile.username} pe ${siteConfig.name}`,
    description: metadataExcerpt(
      profile.bio,
      `Profilul public al utilizatorului ${profile.username} în comunitatea ScripticX.`
    ),
    inLanguage: ["ro", "en"],
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
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(profileJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <ProfileImagePreview
            alt={`${profile.username} profile picture`}
            avatarUrl={profile.avatar_url}
            className="h-16 w-16"
            fallback={initial}
          />

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">
              {profile.username}
            </h1>

            <PublicProfileHeader
              profileId={profile.id}
              profileUsername={profile.username}
            />

            {profile.bio && (
              <p className="text-sm text-muted-foreground">
                {profile.bio}
              </p>
            )}

            <div className="flex gap-4 text-sm flex-wrap">
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
      </div>

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
        <CardHeader>
          <CardTitle>{t("publicProfile.achievements")}</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          {achievements?.map((a: any, i: number) => {
            const Icon = iconMap[a.achievement.icon];
            return (
              <div key={i} className="flex items-center gap-2 px-3 py-1 rounded bg-muted text-sm">
                {Icon && <Icon size={14} />}
                {a.achievement.title}
              </div>
            );
          })}
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
  );
}

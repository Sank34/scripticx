"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import RouteGuard from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import { Flame, Globe, Share2, Trophy, Check, Rocket, Brain } from "lucide-react";
import { siGithub, siX } from "simple-icons";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import { useLanguage } from "@/components/LanguageProvider";
import { getLocalized } from "@/lib/getLocalized";

import { useQuery, useQueryClient } from "@tanstack/react-query";

type ProfileStats = {
  solved: number;
  total: number;
  average: number;
};

type DifficultyStats = {
  easy: number;
  medium: number;
  hard: number;
};

type ProfileData = {
  avatar: string | null;
  username: string | null;
  bio: string;
  github: string;
  twitter: string;
  website: string;
  stats: ProfileStats;
  recent: any[];
  difficulty: DifficultyStats;
  streak: number;
  favorites: string[];
  followers: number;
  following: number;
  achievements: any[];
};

function BrandIcon({ icon }: { icon: any }) {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
      <path d={icon.path} />
    </svg>
  );
}

function normalizeUrl(url: string) {
  if (!url) return "";
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "https://" + url;
  }
  return url;
}

function isValidUrl(url: string) {
  try {
    new URL(normalizeUrl(url));
    return true;
  } catch {
    return false;
  }
}

function ProfileContent() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const queryClient = useQueryClient();
  const iconMap: any = {
    trophy: Trophy,
    flame: Flame,
    check: Check,
    rocket: Rocket,
    brain: Brain,
  };

  async function fetchData(): Promise<ProfileData> {
    if (!user) {
      return {
        avatar: null,
        username: null,
        bio: "",
        github: "",
        twitter: "",
        website: "",
        stats: {
          solved: 0,
          total: 0,
          average: 0,
        },
        recent: [],
        difficulty: {
          easy: 0,
          medium: 0,
          hard: 0,
        },
        streak: 0,
        favorites: [],
        followers: 0,
        following: 0,
        achievements: [],
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio, github, twitter, website")
      .eq("id", user.id)
      .maybeSingle();

    const validAvatar =
      profile?.avatar_url &&
      profile.avatar_url !== "null" &&
      profile.avatar_url.startsWith("http");

    const profileId = profile?.id;

    let followers = 0;
    let following = 0;

    if (profileId) {
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileId);

      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profileId);

      followers = followersCount || 0;
      following = followingCount || 0;
    }

    const { data } = await supabase
      .from("submissions")
      .select(`
        *,
        problems (
          title_i18n,
          difficulty
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!data) {
      return {
        avatar: validAvatar ? profile.avatar_url : null,
        username: profile?.username || null,
        bio: profile?.bio || "",
        github: profile?.github || "",
        twitter: profile?.twitter || "",
        website: profile?.website || "",
        stats: {
          solved: 0,
          total: 0,
          average: 0,
        },
        recent: [],
        difficulty: {
          easy: 0,
          medium: 0,
          hard: 0,
        },
        streak: 0,
        favorites: [],
        followers,
        following,
        achievements: [],
      };
    }

    const best: Record<string, any> = {};
    const days = new Set<string>();

    let easy = 0,
      medium = 0,
      hard = 0;

    for (const sub of data) {
      const day = new Date(sub.created_at).toDateString();
      days.add(day);

      if (!best[sub.problem_id] || sub.score > best[sub.problem_id].score) {
        best[sub.problem_id] = sub;

        const diff = sub.problems?.difficulty;
        if (diff === "easy") easy++;
        if (diff === "medium") medium++;
        if (diff === "hard") hard++;
      }
    }

    const scores = Object.values(best).map((s: any) => s.score);

    const solved = scores.filter((s) => s === 100).length;
    const total = Object.keys(best).length;
    const average =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

    const sortedDays = Array.from(days)
      .map((d) => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    let currentStreak = 0;
    for (let i = 0; i < sortedDays.length; i++) {
      const diff =
        (sortedDays[i].getTime() -
          (sortedDays[i + 1]?.getTime() || sortedDays[i].getTime())) /
        (1000 * 60 * 60 * 24);

      if (i === 0 || diff === 1) currentStreak++;
      else break;
    }

    const count: Record<string, number> = {};
    data.forEach((d) => {
      const title = getLocalized(d.problems?.title_i18n, locale);
      count[title] = (count[title] || 0) + 1;
    });

    const fav = Object.entries(count)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k]) => k);

    const { data: ach } = await supabase
      .from("user_achievements")
      .select(`
        achievement:achievements (
          title,
          icon
        )
      `)
      .eq("user_id", user.id);

    return {
      avatar: validAvatar ? profile.avatar_url : null,
      username: profile?.username || null,
      bio: profile?.bio || "",
      github: profile?.github || "",
      twitter: profile?.twitter || "",
      website: profile?.website || "",
      stats: { solved, total, average },
      recent: data.slice(0, 5),
      difficulty: { easy, medium, hard },
      streak: currentStreak,
      favorites: fav,
      followers,
      following,
      achievements: ach || [],
    };
  }

  const {
    data: profileData,
    isLoading: loading,
  } = useQuery<ProfileData>({
    queryKey: ["profile", user?.id, locale],
    queryFn: fetchData,
    enabled: !!user,
  });

  const avatar = profileData?.avatar || null;
  const username = profileData?.username || null;
  const bio = profileData?.bio || "";
  const github = profileData?.github || "";
  const twitter = profileData?.twitter || "";
  const website = profileData?.website || "";
  const stats = profileData?.stats || {
    solved: 0,
    total: 0,
    average: 0,
  };
  const recent = profileData?.recent || [];
  const difficulty = profileData?.difficulty || {
    easy: 0,
    medium: 0,
    hard: 0,
  };
  const streak = profileData?.streak || 0;
  const favorites = profileData?.favorites || [];
  const followers = profileData?.followers || 0;
  const following = profileData?.following || 0;
  const achievements = profileData?.achievements || [];

  useEffect(() => {
    const handler = async () => {
      await queryClient.invalidateQueries({
        queryKey: ["profile", user?.id],
      });
    };
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, [queryClient, user?.id]);

  if (loading || !user) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-56" />
              <div className="flex gap-4 mt-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
          <Skeleton className="h-9 w-9 rounded-md" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-44" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-10" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
              <CardContent className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center border-b pb-2">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-12" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const successRate = stats.total
    ? Math.round((stats.solved / stats.total) * 100)
    : 0;

  if (!user) return null;

  const email = user.email || "";
  const displayName = username || email.split("@")[0] || "User";
  const initial = (displayName || "U")[0]?.toUpperCase();

  const handleShare = () => {
    const url = `${window.location.origin}/u/${username || user.id}`;
    navigator.clipboard.writeText(url);
    toast.success(t("profile.shareCopied"));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            {avatar && <AvatarImage src={avatar} />}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-2xl font-bold">
              {displayName}
            </h1>
            <p className="text-muted-foreground">{email}</p>

            <div className="flex gap-4 mt-1 text-sm">
              <span><b>{followers}</b> {t("profile.followers")}</span>
              <span><b>{following}</b> {t("profile.following")}</span>
            </div>

            {bio && (
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                {bio}
              </p>
            )}

            <div className="flex gap-4 mt-2 text-sm flex-wrap">
              {github && isValidUrl(github) && (
                <a href={normalizeUrl(github)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                  <BrandIcon icon={siGithub} />
                  GitHub
                </a>
              )}

              {twitter && isValidUrl(twitter) && (
                <a href={normalizeUrl(twitter)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                  <BrandIcon icon={siX} />
                  X
                </a>
              )}

              {website && isValidUrl(website) && (
                <a href={normalizeUrl(website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                  <Globe size={16} />
                  Website
                </a>
              )}
            </div>
          </div>
        </div>

        <Button variant="outline" size="icon" onClick={handleShare}>
          <Share2 size={16} />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="space-y-6">

          <Card>
            <CardHeader>
              <CardTitle>{t("profile.stats.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>{t("profile.stats.solved")}: {stats.solved}</p>
              <p>{t("profile.stats.attempted")}: {stats.total}</p>
              <p>{t("profile.stats.average")}: {stats.average}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("profile.successRate")}</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={successRate} />
              <p className="text-sm mt-2">{successRate}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>{t("profile.streak.title")}</CardTitle>
              <Flame className="w-10 h-10 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{streak}</div>
              <p className="text-xs text-muted-foreground">
                {t("profile.streak.days")}
              </p>
            </CardContent>
          </Card>

        </div>

        <div className="lg:col-span-2 space-y-6">

          <Card>
            <CardHeader>
              <CardTitle>{t("profile.difficulty.title")}</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Badge variant="secondary">{t("profile.difficulty.easy")} {difficulty.easy}</Badge>
              <Badge variant="default">{t("profile.difficulty.medium")} {difficulty.medium}</Badge>
              <Badge variant="destructive">{t("profile.difficulty.hard")} {difficulty.hard}</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("profile.favorites.title")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {favorites.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  {t("profile.favorites.empty")}
                </p>
              )}
              {favorites.map((f, i) => (
                <p key={i} className="text-sm">{f}</p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("profile.achievements.title")}</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2 flex-wrap">
              {achievements.map((a, i) => {
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
              <CardTitle>{t("profile.recent.title")}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {recent.map((r, i) => (
                <div key={i} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-medium">
                      {getLocalized(r.problems?.title_i18n, locale)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                  </div>

                  <Badge
                    variant={
                      r.score === 100
                        ? "default"
                        : r.score >= 50
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {r.score}%
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>

      </div>

    </div>
  );
}

export default function ProfilePage() {
  return (
    <RouteGuard requireAuth>
      <ProfileContent />
    </RouteGuard>
  );
}

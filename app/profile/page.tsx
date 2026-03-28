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

  const [loading, setLoading] = useState(true);

  const [avatar, setAvatar] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [github, setGithub] = useState("");
  const [twitter, setTwitter] = useState("");
  const [website, setWebsite] = useState("");

  const [stats, setStats] = useState({
    solved: 0,
    total: 0,
    average: 0,
  });

  const [recent, setRecent] = useState<any[]>([]);
  const [difficulty, setDifficulty] = useState({
    easy: 0,
    medium: 0,
    hard: 0,
  });

  const [streak, setStreak] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);

  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);

  const [achievements, setAchievements] = useState<any[]>([]);

  const iconMap: any = {
    trophy: Trophy,
    flame: Flame,
    check: Check,
    rocket: Rocket,
    brain: Brain,
  };

  async function fetchData() {
    if (!user) return;

    setLoading(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, bio, github, twitter, website")
      .eq("id", user.id)
      .maybeSingle();

    setUsername(profile?.username || null);
    setBio(profile?.bio || "");
    setGithub(profile?.github || "");
    setTwitter(profile?.twitter || "");
    setWebsite(profile?.website || "");

    const validAvatar =
      profile?.avatar_url &&
      profile.avatar_url !== "null" &&
      profile.avatar_url.startsWith("http");

    setAvatar(validAvatar ? profile.avatar_url : null);

    const profileId = profile?.id;

    if (profileId) {
      const { count: followersCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profileId);

      const { count: followingCount } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profileId);

      setFollowers(followersCount || 0);
      setFollowing(followingCount || 0);
    }

    const { data } = await supabase
      .from("submissions")
      .select(`
        *,
        problems (
          title,
          difficulty
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!data) {
      setLoading(false);
      return;
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
      count[d.problems?.title] = (count[d.problems?.title] || 0) + 1;
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

    setAchievements(ach || []);
    setStats({ solved, total, average });
    setRecent(data.slice(0, 5));
    setDifficulty({ easy, medium, hard });
    setStreak(currentStreak);
    setFavorites(fav);

    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const handler = () => fetchData();
    window.addEventListener("profile-updated", handler);

    return () => {
      window.removeEventListener("profile-updated", handler);
    };
  }, [user]);

  if (loading || !user) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const successRate = stats.total
    ? Math.round((stats.solved / stats.total) * 100)
    : 0;

  const initial = (username || user.email || "U")[0]?.toUpperCase();

  const handleShare = () => {
    const url = `${window.location.origin}/u/${username || user.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Profile link copied!");
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
              {username || user.email.split("@")[0]}
            </h1>
            <p className="text-muted-foreground">{user.email}</p>

            <div className="flex gap-4 mt-1 text-sm">
              <span><b>{followers}</b> followers</span>
              <span><b>{following}</b> following</span>
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
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Solved: {stats.solved}</p>
              <p>Attempted: {stats.total}</p>
              <p>Average: {stats.average}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={successRate} />
              <p className="text-sm mt-2">{successRate}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Streak</CardTitle>
              <Flame className="w-10 h-10 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{streak}</div>
              <p className="text-xs text-muted-foreground">days active</p>
            </CardContent>
          </Card>

        </div>

        <div className="lg:col-span-2 space-y-6">

          <Card>
            <CardHeader>
              <CardTitle>Difficulty Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Badge variant="secondary">Easy {difficulty.easy}</Badge>
              <Badge variant="default">Medium {difficulty.medium}</Badge>
              <Badge variant="destructive">Hard {difficulty.hard}</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Favorite Problems</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {favorites.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No favorites yet.
                </p>
              )}
              {favorites.map((f, i) => (
                <p key={i} className="text-sm">{f}</p>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Achievements</CardTitle>
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
              <CardTitle>Recent Submissions</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {recent.map((r, i) => (
                <div key={i} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <p className="font-medium">{r.problems?.title}</p>
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
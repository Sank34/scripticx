import { createServerSupabase } from "@/lib/supabaseServer";
import PublicProfileHeader from "@/components/PublicProfileHeader";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

import { Flame, Globe, Trophy, Check, Rocket, Brain } from "lucide-react";
import { siGithub, siX } from "simple-icons";

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

export default async function PublicProfile({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const supabase = createServerSupabase();

  const { username } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-bold">User not found</h1>
      </div>
    );
  }

  const { data: submissions } = await supabase
    .from("submissions")
    .select(`
      *,
      problems (
        title,
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

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            {profile.avatar_url && (
              <AvatarImage src={profile.avatar_url} />
            )}
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>

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

        <Card>
          <CardHeader>
            <CardTitle>Solved</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {solved}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Average</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {average}%
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row justify-between items-center">
            <CardTitle>Streak</CardTitle>
            <Flame className="w-5 h-5 text-orange-500" />
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {streak}
          </CardContent>
        </Card>

      </div>

      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
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
          <CardTitle>Recent Submissions</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {submissions?.slice(0, 5).map((r: any, i: number) => (
            <div key={i} className="flex justify-between items-center border-b pb-2">
              <div>
                <p className="font-medium">{r.problems?.title}</p>
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
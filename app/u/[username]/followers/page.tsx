import { cookies } from "next/headers";
import { translations } from "@/lib/i18n";
import { createServerSupabase } from "@/lib/supabaseServer";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

export default async function FollowersPage({
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
    .select("id, username")
    .eq("username", username)
    .single();

  if (!profile) {
    return <div className="p-6">{t("publicProfile.notFound")}</div>;
  }

  const { data: follows } = await supabase
    .from("follows")
    .select(`
      follower_id,
      profiles!follows_follower_id_fkey (
        id,
        username,
        avatar_url
      )
    `)
    .eq("following_id", profile.id);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      <h1 className="text-2xl font-bold">
        {t("social.followers.title")}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>
            {t("social.followers.count").replace("{count}", String(follows?.length || 0))}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">

          {follows?.map((f: any) => {
            const u = f.profiles;

            return (
              <Link
                key={u.id}
                href={`/u/${u.username}`}
                className="flex items-center gap-3 hover:opacity-80 transition"
              >
                <Avatar className="w-9 h-9">
                  {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                  <AvatarFallback>
                    {u.username?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <span className="font-medium">
                  {u.username}
                </span>
              </Link>
            );
          })}

        </CardContent>
      </Card>

    </div>
  );
}
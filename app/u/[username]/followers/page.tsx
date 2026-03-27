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
  const { username } = await params;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("username", username)
    .single();

  if (!profile) {
    return <div className="p-6">User not found</div>;
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
        Followers
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>
            {follows?.length || 0} followers
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
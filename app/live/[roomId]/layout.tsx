import type { Metadata } from "next";

import {
  createNotFoundMetadata,
  createPageMetadata,
} from "@/lib/metadata";
import { createServerSupabase } from "@/lib/supabaseServer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roomId: string }>;
}): Promise<Metadata> {
  const { roomId } = await params;
  const supabase = createServerSupabase();
  const { data: room } = await supabase
    .from("live_rooms")
    .select("name, status")
    .eq("id", roomId)
    .maybeSingle();

  if (!room) return createNotFoundMetadata("Live session");

  const roomName = room.name?.trim() || "Live session";

  return createPageMetadata({
    title: `${roomName} — Live Coding`,
    description:
      room.status === "active"
        ? `Collaborate in real time in the “${roomName}” MiniScript+ session.`
        : `View the completed “${roomName}” MiniScript+ session.`,
    path: `/live/${roomId}`,
    noIndex: true,
  });
}

export default function LiveRoomLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}

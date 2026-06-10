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

  if (!room) return createNotFoundMetadata("Sesiunea");

  const roomName = room.name?.trim() || "Sesiune live";

  return createPageMetadata({
    title: `${roomName} — programare live`,
    description:
      room.status === "active"
        ? `Colaborează în timp real în sesiunea MiniScript+ „${roomName}”.`
        : `Vezi sesiunea MiniScript+ încheiată „${roomName}”.`,
    path: `/live/${roomId}`,
    noIndex: true,
  });
}

export default function LiveRoomLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}

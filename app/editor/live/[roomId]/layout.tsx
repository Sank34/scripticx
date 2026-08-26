import type { Metadata } from "next";

import {
  createNotFoundMetadata,
  createPageMetadata,
} from "@/lib/metadata";
import { createAdminSupabase } from "@/lib/supabaseServer";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ roomId: string }>;
}): Promise<Metadata> {
  const { roomId } = await params;
  const supabase = createAdminSupabase();
  const { data: room } = await supabase
    .from("live_rooms")
    .select("name, status")
    .eq("id", roomId)
    .maybeSingle();

  if (!room) return createNotFoundMetadata("Live session");

  const roomName = room.name?.trim() || "Live session";

  return createPageMetadata({
    title: `${roomName} — Live Editor`,
    description:
      room.status === "active"
        ? `Collaborate in real time in the “${roomName}” ScripticX editor session.`
        : `View the completed “${roomName}” ScripticX editor session.`,
    path: `/editor/live/${roomId}`,
    noIndex: true,
  });
}

export default function EditorLiveRoomLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}

import { redirect } from "next/navigation";

export default async function LegacyEditorLiveRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  redirect(`/editor?live=${encodeURIComponent(roomId)}&view=live`);
}

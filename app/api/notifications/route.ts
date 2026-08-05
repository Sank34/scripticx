import { NextResponse } from "next/server";

import { createAdminSupabase } from "@/lib/supabaseServer";
import {
  enforceRateLimit,
  HttpError,
  jsonObject,
  readJsonBody,
  requireUser,
  stableEventKey,
  stringField,
} from "@/lib/server/requestSecurity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type NotificationDraft = {
  title: string;
  body: string;
  href: string;
  metadata: Record<string, unknown>;
  eventId: string;
};

function metadataId(metadata: Record<string, unknown>, key: string) {
  return stringField(metadata[key], { min: 1, max: 100 });
}

function containsMention(content: string, username: string) {
  const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|\\s)@${escaped}(?![a-z0-9_-])`, "i").test(content);
}

export async function POST(request: Request) {
  try {
    const { user } = await requireUser(request);
    await enforceRateLimit({
      key: user.id,
      action: "notification_create",
      limit: 30,
      windowSeconds: 60,
    });

    const body = jsonObject(await readJsonBody(request, 10_000));
    const recipientId = stringField(body.userId, { min: 1, max: 100 });
    const type = stringField(body.type, { min: 2, max: 50 });
    const locale = body.locale === "ro" ? "ro" : "en";
    const metadata = jsonObject(body.metadata);
    if (recipientId === user.id && type !== "daily_challenge") {
      return NextResponse.json({ created: false });
    }

    const admin = createAdminSupabase();
    const { data: actor } = await admin
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle<{ username: string | null }>();
    const actorName = actor?.username || (locale === "ro" ? "Cineva" : "Someone");
    let draft: NotificationDraft;

    switch (type) {
      case "follow": {
        const { data: follow } = await admin
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", recipientId)
          .maybeSingle();
        if (!follow) throw new HttpError(403, "Notification event is not valid");
        draft = {
          title: locale === "ro" ? `${actorName} te urmărește` : `${actorName} started following you`,
          body: locale === "ro" ? "Deschide profilul din ScripticX." : "Open their profile from ScripticX.",
          href: actor?.username ? `/u/${actor.username}` : "/profile",
          metadata: { username: actor?.username || null },
          eventId: `${user.id}:${recipientId}`,
        };
        break;
      }
      case "post_like": {
        const postId = metadataId(metadata, "postId");
        const [{ data: post }, { data: like }] = await Promise.all([
          admin.from("posts").select("user_id, content").eq("id", postId).eq("user_id", recipientId).maybeSingle<{ user_id: string; content: string }>(),
          admin.from("post_likes").select("post_id").eq("post_id", postId).eq("user_id", user.id).maybeSingle(),
        ]);
        if (!post || !like) throw new HttpError(403, "Notification event is not valid");
        draft = {
          title: locale === "ro" ? `${actorName} ți-a apreciat postarea` : `${actorName} liked your post`,
          body: post.content?.slice(0, 120) || "ScripticX",
          href: `/post/${postId}`,
          metadata: { postId, username: actor?.username || null },
          eventId: `${postId}:${user.id}`,
        };
        break;
      }
      case "post_comment": {
        const postId = metadataId(metadata, "postId");
        const commentId = metadataId(metadata, "commentId");
        const [{ data: post }, { data: comment }] = await Promise.all([
          admin.from("posts").select("user_id").eq("id", postId).eq("user_id", recipientId).maybeSingle(),
          admin.from("comments").select("content").eq("id", commentId).eq("post_id", postId).eq("user_id", user.id).maybeSingle<{ content: string }>(),
        ]);
        if (!post || !comment) throw new HttpError(403, "Notification event is not valid");
        draft = {
          title: locale === "ro" ? `${actorName} a comentat la postarea ta` : `${actorName} commented on your post`,
          body: comment.content.slice(0, 140),
          href: `/post/${postId}`,
          metadata: { postId, commentId, username: actor?.username || null },
          eventId: commentId,
        };
        break;
      }
      case "post_mention": {
        const postId = metadataId(metadata, "postId");
        const [{ data: post }, { data: recipient }] = await Promise.all([
          admin.from("posts").select("user_id, content").eq("id", postId).eq("user_id", user.id).maybeSingle<{ user_id: string; content: string }>(),
          admin.from("profiles").select("username").eq("id", recipientId).maybeSingle<{ username: string | null }>(),
        ]);
        if (!post || !recipient?.username || !containsMention(post.content, recipient.username)) {
          throw new HttpError(403, "Notification event is not valid");
        }
        draft = {
          title: locale === "ro" ? `${actorName} te-a menționat într-o postare` : `${actorName} mentioned you in a post`,
          body: post.content.slice(0, 160),
          href: `/post/${postId}`,
          metadata: { postId, mentionedUsername: recipient.username },
          eventId: `${postId}:${recipientId}`,
        };
        break;
      }
      case "new_assignment": {
        const assignmentId = metadataId(metadata, "assignmentId");
        const classId = metadataId(metadata, "classId");
        const [{ data: assignment }, { data: classRow }, { data: member }] = await Promise.all([
          admin.from("assignments").select("title, class_id").eq("id", assignmentId).eq("class_id", classId).maybeSingle<{ title: string; class_id: string }>(),
          admin.from("classes").select("name, teacher_id").eq("id", classId).maybeSingle<{ name: string; teacher_id: string }>(),
          admin.from("class_members").select("role").eq("class_id", classId).eq("user_id", recipientId).maybeSingle<{ role: string }>(),
        ]);
        if (!assignment || classRow?.teacher_id !== user.id || !member || member.role === "teacher") {
          throw new HttpError(403, "Notification event is not valid");
        }
        draft = {
          title: locale === "ro" ? `Temă nouă în ${classRow.name}` : `New assignment in ${classRow.name}`,
          body: assignment.title,
          href: `/classes/${classId}/assignments/${assignmentId}`,
          metadata: { assignmentId, classId, className: classRow.name },
          eventId: `${assignmentId}:${recipientId}`,
        };
        break;
      }
      case "daily_challenge": {
        if (recipientId !== user.id) throw new HttpError(403, "Notification event is not valid");
        const challengeId = metadataId(metadata, "challengeId");
        const today = new Date().toISOString().slice(0, 10);
        const { data: challenge } = await admin
          .from("daily_challenges")
          .select("problem_id, challenge_date")
          .eq("id", challengeId)
          .eq("challenge_date", today)
          .eq("is_active", true)
          .maybeSingle<{ problem_id: string; challenge_date: string }>();
        if (!challenge) throw new HttpError(403, "Notification event is not valid");
        draft = {
          title: locale === "ro" ? "Challenge-ul zilei este disponibil" : "Today's challenge is ready",
          body: locale === "ro" ? "Rezolvă provocarea de azi." : "Solve today's coding challenge.",
          href: `/problems/${challenge.problem_id}`,
          metadata: { challengeId, challengeDate: today, problemId: challenge.problem_id },
          eventId: `${today}:${recipientId}`,
        };
        break;
      }
      case "group_message": {
        const groupId = metadataId(metadata, "groupId");
        const messageId = metadataId(metadata, "messageId");
        const [{ data: message }, { data: group }, { data: member }, { data: recipient }] = await Promise.all([
          admin.from("study_group_messages").select("content, channel_id").eq("id", messageId).eq("group_id", groupId).eq("user_id", user.id).maybeSingle<{ content: string; channel_id: string }>(),
          admin.from("study_groups").select("name, slug").eq("id", groupId).maybeSingle<{ name: string; slug: string }>(),
          admin.from("study_group_members").select("status").eq("group_id", groupId).eq("user_id", recipientId).eq("status", "active").maybeSingle(),
          admin.from("profiles").select("username").eq("id", recipientId).maybeSingle<{ username: string | null }>(),
        ]);
        if (!message || !group || !member || !recipient?.username || !containsMention(message.content, recipient.username)) {
          throw new HttpError(403, "Notification event is not valid");
        }
        draft = {
          title: locale === "ro" ? `${actorName} te-a menționat în ${group.name}` : `${actorName} mentioned you in ${group.name}`,
          body: message.content.slice(0, 120),
          href: `/groups/${group.slug}`,
          metadata: { groupId, channelId: message.channel_id, messageId },
          eventId: `${messageId}:${recipientId}`,
        };
        break;
      }
      case "group_invite": {
        const groupId = metadataId(metadata, "groupId");
        const [{ data: group }, { data: invite }] = await Promise.all([
          admin.from("study_groups").select("name, slug, owner_id").eq("id", groupId).maybeSingle<{ name: string; slug: string; owner_id: string }>(),
          admin.from("study_group_members").select("status").eq("group_id", groupId).eq("user_id", recipientId).eq("status", "invited").maybeSingle(),
        ]);
        if (!group || group.owner_id !== user.id || !invite) throw new HttpError(403, "Notification event is not valid");
        draft = {
          title: locale === "ro" ? `Ai fost invitat în ${group.name}` : `You were invited to ${group.name}`,
          body: locale === "ro" ? `${actorName} te-a invitat să intri în grup.` : `${actorName} invited you to join this group.`,
          href: `/groups/${group.slug}`,
          metadata: { groupId, inviteeId: recipientId },
          eventId: `${groupId}:${recipientId}`,
        };
        break;
      }
      case "live_invite": {
        const roomId = metadataId(metadata, "roomId");
        const [{ data: room }, { data: invite }] = await Promise.all([
          admin.from("live_rooms").select("name, owner_id").eq("id", roomId).eq("owner_id", user.id).maybeSingle<{ name: string | null; owner_id: string }>(),
          admin.from("room_participants").select("status").eq("room_id", roomId).eq("user_id", recipientId).maybeSingle(),
        ]);
        if (!room || !invite) throw new HttpError(403, "Notification event is not valid");
        draft = {
          title: locale === "ro" ? `${actorName} te-a invitat la o sesiune live` : `${actorName} invited you to a live session`,
          body: room.name || "ScripticX live",
          href: `/live/${roomId}`,
          metadata: { roomId, roomName: room.name },
          eventId: `${roomId}:${recipientId}`,
        };
        break;
      }
      default:
        throw new HttpError(400, "Unsupported notification type");
    }

    const dedupeKey = stableEventKey({ type, eventId: draft.eventId });
    const { error } = await admin.from("notifications").upsert(
      {
        user_id: recipientId,
        actor_id: user.id,
        type,
        title: draft.title,
        body: draft.body,
        href: draft.href,
        metadata: draft.metadata,
        dedupe_key: dedupeKey,
      },
      { onConflict: "dedupe_key", ignoreDuplicates: true }
    );
    if (error) throw error;

    return NextResponse.json({ created: true }, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Notification creation failed:", error);
    return NextResponse.json({ error: "Could not create notification" }, { status: 500 });
  }
}

import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type ProfileSummary = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  role?: string | null;
  banned?: boolean | null;
  total_score?: number | null;
  [key: string]: unknown;
};

export type FeedPost = {
  id: string;
  user_id: string;
  content: string;
  code?: string | null;
  image_url?: string | null;
  created_at?: string | null;
  profiles?: ProfileSummary | null;
  [key: string]: unknown;
};

export type FeedData = {
  posts: FeedPost[];
  likes: Record<string, number>;
  liked: Record<string, boolean>;
  commentCounts: Record<string, number>;
  suggested: ProfileSummary[];
  following: Set<string>;
};

export type LiveRoom = {
  id: string;
  owner_id: string;
  name?: string | null;
  code?: string | null;
  status?: string | null;
  created_at?: string | null;
  ended_at?: string | null;
  [key: string]: unknown;
};

export type LiveMessage = {
  id?: string;
  room_id?: string;
  user_id?: string;
  userId?: string;
  text: string;
  created_at?: string;
  createdAt?: string;
  [key: string]: unknown;
};

export type RoomParticipant = {
  id?: string;
  room_id?: string;
  user_id: string;
  status?: string | null;
  [key: string]: unknown;
};

export type LiveCodeInvite = {
  room_id: string;
  live_rooms?: LiveRoom | LiveRoom[] | null;
  [key: string]: unknown;
};

export type LiveCodeData = {
  rooms: LiveRoom[];
  invites: LiveCodeInvite[];
  userId: string | null;
  participantsByRoom: Record<string, ProfileSummary[]>;
};

export type AppNotification = {
  id: string;
  user_id: string;
  actor_id?: string | null;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  metadata?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at: string;
  actor?: ProfileSummary | null;
};

export type DailyChallenge = {
  id: string;
  challenge_date: string;
  problem_id: string;
  bonus_points?: number | null;
  is_active?: boolean | null;
  created_at?: string | null;
  problems?: {
    id: string;
    code?: number | null;
    title_i18n?: Record<string, string> | null;
    description_i18n?: Record<string, string> | null;
    difficulty?: string | null;
  } | null;
};

type SupabaseAuthSubscription = ReturnType<
  SupabaseClient["auth"]["onAuthStateChange"]
>["data"]["subscription"];

type PostCommentRow = {
  post_id: string;
};

type PostLikeRow = {
  post_id: string;
  user_id: string;
};

type FollowRow = {
  following_id: string;
};

type CreatePostInput = {
  userId: string;
  content: string;
  code?: string | null;
  image?: File | null;
};

type CreateNotificationInput = {
  userId: string;
  actorId?: string | null;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  metadata?: Record<string, unknown>;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error("Request timed out"));
    }, timeoutMs);

    promise
      .then(resolve, reject)
      .finally(() => window.clearTimeout(timeout));
  });
}

class AuthApi {
  constructor(private readonly client: SupabaseClient) {}

  getSession() {
    return this.client.auth.getSession();
  }

  getSessionWithTimeout(timeoutMs: number) {
    return withTimeout(this.getSession(), timeoutMs);
  }

  onAuthStateChange(
    callback: (session: Session | null) => void
  ): SupabaseAuthSubscription {
    const {
      data: { subscription },
    } = this.client.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });

    return subscription;
  }

  signOut() {
    return this.client.auth.signOut();
  }

  refreshSession() {
    return this.client.auth.refreshSession();
  }
}

class ProfilesApi {
  constructor(private readonly client: SupabaseClient) {}

  async getProfile(id: string): Promise<ProfileSummary | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle<ProfileSummary>();

    if (error) throw error;

    return data || null;
  }

  async getSummary(id: string): Promise<ProfileSummary | null> {
    const { data, error } = await this.client
      .from("profiles")
      .select("id, username, avatar_url, role, banned, total_score")
      .eq("id", id)
      .maybeSingle<ProfileSummary>();

    if (error) throw error;

    return data || null;
  }

  async listSummaries(ids: string[]): Promise<ProfileSummary[]> {
    if (!ids.length) return [];

    const { data, error } = await this.client
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", ids);

    if (error) throw error;

    return data || [];
  }

  async listSuggested(excludeUserId: string): Promise<ProfileSummary[]> {
    const { data, error } = await this.client
      .from("profiles")
      .select("id, username, avatar_url")
      .neq("id", excludeUserId);

    if (error) throw error;

    return data || [];
  }
}

class FeedApi {
  constructor(
    private readonly client: SupabaseClient,
    private readonly profiles: ProfilesApi
  ) {}

  async getFeedData(userId: string): Promise<FeedData> {
    const { data: postsData, error: postsError } = await this.client
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    if (postsError) throw postsError;

    const postsDataSafe = (postsData || []) as FeedPost[];
    const postIds = postsDataSafe.map((post) => post.id);
    const authorIds = [
      ...new Set(postsDataSafe.map((post) => post.user_id).filter(Boolean)),
    ];

    const [
      profilesData,
      { data: commentsData, error: commentsError },
      { data: likesData, error: likesError },
      { data: followingData, error: followingError },
      suggestedUsers,
    ] = await Promise.all([
      this.profiles.listSummaries(authorIds),
      postIds.length
        ? this.client
            .from("comments")
            .select("post_id")
            .in("post_id", postIds)
        : Promise.resolve({ data: [] as PostCommentRow[], error: null }),
      postIds.length
        ? this.client
            .from("post_likes")
            .select("post_id, user_id")
            .in("post_id", postIds)
        : Promise.resolve({ data: [] as PostLikeRow[], error: null }),
      this.client
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId),
      this.profiles.listSuggested(userId),
    ]);

    if (commentsError) throw commentsError;
    if (likesError) throw likesError;
    if (followingError) throw followingError;

    const profileMap = new Map(
      profilesData.map((profile) => [profile.id, profile])
    );
    const commentCounts: Record<string, number> = {};
    const likes: Record<string, number> = {};
    const liked: Record<string, boolean> = {};

    for (const comment of (commentsData || []) as PostCommentRow[]) {
      commentCounts[comment.post_id] =
        (commentCounts[comment.post_id] || 0) + 1;
    }

    for (const like of (likesData || []) as PostLikeRow[]) {
      likes[like.post_id] = (likes[like.post_id] || 0) + 1;
      if (like.user_id === userId) {
        liked[like.post_id] = true;
      }
    }

    const following = new Set(
      ((followingData || []) as FollowRow[]).map((follow) => follow.following_id)
    );

    return {
      posts: postsDataSafe.map((post) => ({
        ...post,
        profiles: profileMap.get(post.user_id) || null,
      })),
      likes,
      liked,
      commentCounts,
      suggested: suggestedUsers
        .filter((profile) => !following.has(profile.id))
        .slice(0, 5),
      following,
    };
  }

  async toggleLike(postId: string, userId: string, isLiked: boolean) {
    if (isLiked) {
      const { error } = await this.client
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", userId);

      if (error) throw error;
      return;
    }

    const { error } = await this.client
      .from("post_likes")
      .insert([{ post_id: postId, user_id: userId }]);

    if (error) throw error;

    const [{ data: post }, actor] = await Promise.all([
      this.client
        .from("posts")
        .select("id, user_id, content")
        .eq("id", postId)
        .maybeSingle<FeedPost>(),
      this.profiles.getSummary(userId),
    ]);

    if (post?.user_id && post.user_id !== userId) {
      await NotificationsApi.createWithClient(this.client, {
        userId: post.user_id,
        actorId: userId,
        type: "post_like",
        title: `${actor?.username || "Someone"} liked your post`,
        body: post.content?.slice(0, 120) || "Open your post on ScripticX.",
        href: `/post/${postId}`,
        metadata: {
          postId,
          username: actor?.username || null,
        },
      });
    }
  }

  async createPost({ userId, content, code, image }: CreatePostInput) {
    let imageUrl: string | null = null;

    if (image) {
      const ext = image.name.split(".").pop();
      const fileName = `${userId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await this.client.storage
        .from("posts")
        .upload(fileName, image);

      if (uploadError) throw uploadError;

      const { data } = this.client.storage
        .from("posts")
        .getPublicUrl(fileName);

      imageUrl = data.publicUrl;
    }

    const { error } = await this.client.from("posts").insert([
      {
        user_id: userId,
        content,
        code: code || null,
        image_url: imageUrl,
      },
    ]);

    if (error) throw error;
  }

  async toggleFollow(
    followerId: string,
    followingId: string,
    isFollowing: boolean
  ) {
    if (isFollowing) {
      const { error } = await this.client
        .from("follows")
        .delete()
        .eq("follower_id", followerId)
        .eq("following_id", followingId);

      if (error) throw error;
      return;
    }

    const { error } = await this.client.from("follows").insert({
      follower_id: followerId,
      following_id: followingId,
    });

    if (error) throw error;

    const actor = await this.profiles.getSummary(followerId);

    await NotificationsApi.createWithClient(this.client, {
      userId: followingId,
      actorId: followerId,
      type: "follow",
      title: `${actor?.username || "Someone"} started following you`,
      body: "Open their profile from ScripticX.",
      href: actor?.username ? `/u/${actor.username}` : "/profile",
      metadata: {
        username: actor?.username || null,
      },
    });
  }
}

class NotificationsApi {
  constructor(
    private readonly client: SupabaseClient,
    private readonly profiles: ProfilesApi
  ) {}

  static async createWithClient(
    client: SupabaseClient,
    input: CreateNotificationInput
  ) {
    const { error } = await client.from("notifications").insert({
      user_id: input.userId,
      actor_id: input.actorId || null,
      type: input.type,
      title: input.title,
      body: input.body || null,
      href: input.href || null,
      metadata: input.metadata || {},
    });

    if (error) {
      console.warn("Could not create notification.", error);
    }
  }

  async create(input: CreateNotificationInput) {
    await NotificationsApi.createWithClient(this.client, input);
  }

  async createForNewAssignment(input: {
    actorId: string;
    assignmentId: string;
    assignmentTitle: string;
    classId: string;
    className?: string | null;
  }) {
    const { data: memberRows, error: membersError } = await this.client
      .from("class_members")
      .select("user_id, role")
      .eq("class_id", input.classId);

    if (membersError) throw membersError;

    const recipientIds = [
      ...new Set(
        (memberRows || [])
          .filter(
            (member) =>
              member.user_id !== input.actorId && member.role !== "teacher"
          )
          .map((member) => member.user_id)
          .filter((userId): userId is string => Boolean(userId))
      ),
    ];

    if (recipientIds.length === 0) return 0;

    const href = `/classes/${input.classId}/assignments/${input.assignmentId}`;
    const metadata = {
      assignmentId: input.assignmentId,
      classId: input.classId,
      className: input.className || null,
    };

    const { error } = await this.client.from("notifications").insert(
      recipientIds.map((userId) => ({
        user_id: userId,
        actor_id: input.actorId,
        type: "new_assignment",
        title: `New assignment in ${input.className || "your class"}`,
        body: input.assignmentTitle,
        href,
        metadata,
      }))
    );

    if (error) throw error;

    return recipientIds.length;
  }

  async list(userId: string, limit = 30): Promise<AppNotification[]> {
    const { data, error } = await this.client
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error?.code === "42P01" || error?.code === "PGRST205") {
      console.warn("Notifications table is not available yet.", error);
      return [];
    }

    if (error) throw error;

    const notifications = (data || []) as AppNotification[];
    const actorIds = [
      ...new Set(
        notifications
          .map((notification) => notification.actor_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];
    const actors = await this.profiles.listSummaries(actorIds);
    const actorMap = new Map(actors.map((actor) => [actor.id, actor]));

    return notifications.map((notification) => ({
      ...notification,
      actor: notification.actor_id
        ? actorMap.get(notification.actor_id) || null
        : null,
    }));
  }

  async unreadCount(userId: string): Promise<number> {
    const { count, error } = await this.client
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error?.code === "42P01" || error?.code === "PGRST205") {
      console.warn("Notifications table is not available yet.", error);
      return 0;
    }

    if (error) throw error;

    return count || 0;
  }

  async markAsRead(notificationId: string, userId: string) {
    const { error } = await this.client
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  async markAllAsRead(userId: string) {
    const { error } = await this.client
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) throw error;
  }
}

class LiveApi {
  constructor(private readonly client: SupabaseClient) {}

  async getRoom(roomId: string): Promise<LiveRoom | null> {
    const { data, error } = await this.client
      .from("live_rooms")
      .select("*")
      .eq("id", roomId)
      .maybeSingle<LiveRoom>();

    if (error) throw error;

    return data || null;
  }

  async getMessages(roomId: string): Promise<LiveMessage[]> {
    const { data, error } = await this.client
      .from("live_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return data || [];
  }

  async listProfiles(limit = 50): Promise<ProfileSummary[]> {
    const { data, error } = await this.client
      .from("profiles")
      .select("id, username, avatar_url")
      .limit(limit);

    if (error) throw error;

    return data || [];
  }

  async listProfilesByIds(ids: string[]): Promise<ProfileSummary[]> {
    if (!ids.length) return [];

    const { data, error } = await this.client
      .from("profiles")
      .select("id, username, avatar_url, bio, github, twitter, website")
      .in("id", ids);

    if (error) throw error;

    return data || [];
  }

  async getParticipant(roomId: string, userId: string) {
    const { data, error } = await this.client
      .from("room_participants")
      .select("id, status, user_id")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .maybeSingle<RoomParticipant>();

    if (error) throw error;

    return data || null;
  }

  async inviteUser(roomId: string, userId: string) {
    const { error } = await this.client
      .from("room_participants")
      .upsert(
        {
          room_id: roomId,
          user_id: userId,
          status: "invited",
        },
        { onConflict: "room_id,user_id" }
      );

    if (error) throw error;
  }

  async markLiveParticipant(roomId: string, userId: string) {
    const { error } = await this.client
      .from("live_participants")
      .upsert(
        {
          room_id: roomId,
          user_id: userId,
        },
        { onConflict: "room_id,user_id" }
      );

    if (error) throw error;
  }

  async joinRoom(roomId: string, userId: string) {
    const { error } = await this.client
      .from("room_participants")
      .upsert(
        {
          room_id: roomId,
          user_id: userId,
          status: "accepted",
        },
        { onConflict: "room_id,user_id" }
      );

    if (error) throw error;
  }

  async removeLiveParticipant(roomId: string, userId: string) {
    const { error } = await this.client
      .from("live_participants")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  async listRoomParticipants(roomId: string) {
    const { data, error } = await this.client
      .from("room_participants")
      .select("user_id, status")
      .eq("room_id", roomId)
      .in("status", ["accepted", "invited"]);

    if (error) throw error;

    return (data || []) as Array<{ user_id: string; status?: string | null }>;
  }

  async removeRoomParticipant(roomId: string, userId: string) {
    const [{ error: participantError }, { error: liveError }] = await Promise.all([
      this.client
        .from("room_participants")
        .update({ status: "removed" })
        .eq("room_id", roomId)
        .eq("user_id", userId),
      this.client
        .from("live_participants")
        .delete()
        .eq("room_id", roomId)
        .eq("user_id", userId),
    ]);

    if (participantError) throw participantError;
    if (liveError) throw liveError;
  }

  async saveCode(roomId: string, code: string) {
    const { error } = await this.client.rpc("update_live_room_code", {
      p_room_id: roomId,
      p_code: code,
    });

    if (!error) return;

    const isMissingRpc =
      error.code === "PGRST202" ||
      error.message?.includes("Could not find the function");

    if (!isMissingRpc) throw error;

    const { error: updateError } = await this.client
      .from("live_rooms")
      .update({ code })
      .eq("id", roomId);

    if (updateError) throw updateError;
  }

  async closeRoom(roomId: string) {
    const { error } = await this.client
      .from("live_rooms")
      .update({ status: "closed", ended_at: new Date().toISOString() })
      .eq("id", roomId);

    if (error) throw error;
  }

  async sendMessage(roomId: string, userId: string, text: string) {
    const { error } = await this.client.from("live_messages").insert({
      room_id: roomId,
      user_id: userId,
      text,
    });

    if (error) throw error;
  }

  async getLiveCodeData(): Promise<LiveCodeData> {
    const { data: sessionData } = await this.client.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      return {
        rooms: [],
        invites: [],
        userId: null,
        participantsByRoom: {},
      };
    }

    const [
      { data: inviteData, error: inviteError },
      { data: ownedRooms, error: ownedError },
      { data: participantRows, error: participantError },
    ] = await Promise.all([
      this.client
        .from("room_participants")
        .select("room_id, live_rooms(*)")
        .eq("user_id", user.id)
        .eq("status", "invited"),
      this.client
        .from("live_rooms")
        .select("*")
        .eq("owner_id", user.id),
      this.client
        .from("room_participants")
        .select("room_id")
        .eq("user_id", user.id)
        .eq("status", "accepted"),
    ]);

    if (inviteError) throw inviteError;
    if (ownedError) throw ownedError;
    if (participantError) throw participantError;

    const roomIds = ((participantRows || []) as Array<{ room_id: string }>).map(
      (row) => row.room_id
    );

    let participantRooms: LiveRoom[] = [];
    if (roomIds.length) {
      const { data, error } = await this.client
        .from("live_rooms")
        .select("*")
        .in("id", roomIds);

      if (error) throw error;

      participantRooms = data || [];
    }

    const uniqueMap = new Map<string, LiveRoom>();
    [...((ownedRooms || []) as LiveRoom[]), ...participantRooms].forEach(
      (room) => {
        uniqueMap.set(room.id, room);
      }
    );

    const rooms = Array.from(uniqueMap.values()).sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );

    const participantsByRoom = await this.getParticipantsByRoom(rooms);

    return {
      rooms,
      invites: (inviteData || []) as LiveCodeInvite[],
      userId: user.id,
      participantsByRoom,
    };
  }

  async getParticipantsByRoom(rooms: LiveRoom[]) {
    const roomIds = rooms.map((room) => room.id);
    if (!roomIds.length) return {};

    const [
      { data: liveParticipants, error: liveParticipantsError },
      { data: roomParticipants, error: roomParticipantsError },
    ] = await Promise.all([
      this.client
        .from("live_participants")
        .select("room_id, user_id")
        .in("room_id", roomIds),
      this.client
        .from("room_participants")
        .select("room_id, user_id")
        .in("room_id", roomIds)
        .in("status", ["accepted", "invited"]),
    ]);

    if (liveParticipantsError) throw liveParticipantsError;

    if (roomParticipantsError) {
      console.warn("Could not load accepted room participants:", roomParticipantsError);
    }

    const ownerIds = rooms.map((room) => room.owner_id);
    const participantRows = [
      ...((liveParticipants || []) as Array<{ room_id: string; user_id: string }>),
      ...((roomParticipantsError ? [] : roomParticipants || []) as Array<{
        room_id: string;
        user_id: string;
      }>),
    ];
    const userIds = [
      ...new Set([
        ...participantRows.map((participant) => participant.user_id),
        ...ownerIds,
      ]),
    ];

    const profiles = await this.listProfilesByIds(userIds);
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const grouped: Record<string, ProfileSummary[]> = {};

    rooms.forEach((room) => {
      grouped[room.id] = [];
    });

    rooms.forEach((room) => {
      const ownerProfile = profileMap.get(room.owner_id);
      if (ownerProfile) grouped[room.id].push(ownerProfile);
    });

    participantRows.forEach((participant) => {
      const profile = profileMap.get(participant.user_id);
      const roomProfiles = grouped[participant.room_id];

      if (
        profile &&
        roomProfiles &&
        !roomProfiles.some((item) => item.id === profile.id)
      ) {
        roomProfiles.push(profile);
      }
    });

    return grouped;
  }

  async createRoom(ownerId: string, name: string) {
    const { data, error } = await this.client
      .from("live_rooms")
      .insert({
        owner_id: ownerId,
        name,
        status: "active",
      })
      .select()
      .single<LiveRoom>();

    if (error) throw error;

    return data;
  }

  async acceptInvite(roomId: string, userId: string) {
    const { error } = await this.client
      .from("room_participants")
      .update({ status: "accepted" })
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  async declineInvite(roomId: string, userId: string) {
    const { error } = await this.client
      .from("room_participants")
      .delete()
      .eq("room_id", roomId)
      .eq("user_id", userId);

    if (error) throw error;
  }
}

class DailyChallengesApi {
  constructor(private readonly client: SupabaseClient) {}

  getTodayKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  async getForDate(dateKey = this.getTodayKey()): Promise<DailyChallenge | null> {
    const { data, error } = await this.client
      .from("daily_challenges")
      .select(`
        *,
        problems (
          id,
          code,
          title_i18n,
          description_i18n,
          difficulty
        )
      `)
      .eq("challenge_date", dateKey)
      .eq("is_active", true)
      .maybeSingle<DailyChallenge>();

    if (error?.code === "42P01" || error?.code === "PGRST205") {
      console.warn("Daily challenges table is not available yet.", error);
      return null;
    }

    if (error) throw error;

    return data || null;
  }

  async list(limit = 20, fromDate = this.getTodayKey()): Promise<DailyChallenge[]> {
    const { data, error } = await this.client
      .from("daily_challenges")
      .select(`
        *,
        problems (
          id,
          code,
          title_i18n,
          description_i18n,
          difficulty
        )
      `)
      .gte("challenge_date", fromDate)
      .order("challenge_date", { ascending: true })
      .limit(limit);

    if (error?.code === "42P01" || error?.code === "PGRST205") {
      console.warn("Daily challenges table is not available yet.", error);
      return [];
    }

    if (error) throw error;

    return (data || []) as DailyChallenge[];
  }

  async getCompletion(challengeId: string, userId: string) {
    const { data, error } = await this.client
      .from("daily_challenge_completions")
      .select("id")
      .eq("challenge_id", challengeId)
      .eq("user_id", userId)
      .maybeSingle<{ id: string }>();

    if (error?.code === "42P01" || error?.code === "PGRST205") {
      console.warn("Daily challenge completions table is not available yet.", error);
      return null;
    }

    if (error) throw error;

    return data || null;
  }

  async complete(input: {
    challengeId: string;
    userId: string;
    problemId: string;
    bonusPoints: number;
  }) {
    const { error } = await this.client.from("daily_challenge_completions").insert({
      challenge_id: input.challengeId,
      user_id: input.userId,
      problem_id: input.problemId,
      bonus_points: input.bonusPoints,
    });

    if (error?.code === "23505") return false;

    if (error) throw error;

    return true;
  }

  async schedule(input: {
    date: string;
    problemId: string;
    bonusPoints: number;
    createdBy: string;
  }) {
    if (input.date < this.getTodayKey()) {
      throw new Error("Daily challenges can only be scheduled from today onward.");
    }

    const { error } = await this.client.from("daily_challenges").upsert(
      {
        challenge_date: input.date,
        problem_id: input.problemId,
        bonus_points: input.bonusPoints,
        created_by: input.createdBy,
        is_active: true,
      },
      { onConflict: "challenge_date" }
    );

    if (error) throw error;
  }

  async ensureTodayNotification(userId: string, locale = "en") {
    const today = this.getTodayKey();
    const challenge = await this.getForDate(today);

    if (!challenge?.problem_id) return null;

    const { data: existing, error: existingError } = await this.client
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "daily_challenge")
      .contains("metadata", { challengeDate: today })
      .limit(1);

    if (existingError?.code !== "42P01" && existingError?.code !== "PGRST205" && existingError) {
      throw existingError;
    }

    if (existing?.length) return challenge;

    const title =
      locale === "ro"
        ? "Challenge-ul zilei este disponibil"
        : "Today's challenge is ready";
    const problemTitle =
      challenge.problems?.title_i18n?.[locale] ||
      challenge.problems?.title_i18n?.en ||
      challenge.problems?.title_i18n?.ro ||
      "Daily coding challenge";

    await NotificationsApi.createWithClient(this.client, {
      userId,
      actorId: userId,
      type: "daily_challenge",
      title,
      body:
        locale === "ro"
          ? `Rezolvă: ${problemTitle}`
          : `Solve: ${problemTitle}`,
      href: `/problems/${challenge.problem_id}`,
      metadata: {
        challengeId: challenge.id,
        challengeDate: today,
        problemId: challenge.problem_id,
      },
    });

    return challenge;
  }
}

class AppApi {
  readonly auth: AuthApi;
  readonly profiles: ProfilesApi;
  readonly feed: FeedApi;
  readonly live: LiveApi;
  readonly notifications: NotificationsApi;
  readonly dailyChallenges: DailyChallengesApi;

  constructor(private readonly client: SupabaseClient) {
    this.auth = new AuthApi(client);
    this.profiles = new ProfilesApi(client);
    this.feed = new FeedApi(client, this.profiles);
    this.live = new LiveApi(client);
    this.notifications = new NotificationsApi(client, this.profiles);
    this.dailyChallenges = new DailyChallengesApi(client);
  }
}

export const api = new AppApi(supabase);

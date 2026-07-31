import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { extractMentionUsernames } from "@/lib/mentions";

export type ProfileSummary = {
  id: string;
  username?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  role?: string | null;
  banned?: boolean | null;
  total_score?: number | null;
  [key: string]: unknown;
};

export type MentionCandidate = {
  id: string;
  username: string;
  avatar_url: string | null;
  isFollowing: boolean;
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

export type StudyGroup = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  visibility?: "public" | "private" | string | null;
  owner_id: string;
  avatar_url?: string | null;
  created_at?: string | null;
  member_count?: number | null;
  channel_count?: number | null;
  role?: string | null;
  status?: string | null;
  owner?: ProfileSummary | null;
};

export type StudyGroupActivitySummary = {
  groupId: string;
  latestMessageAt: string | null;
  unreadMentionCount: number;
  channels: Array<{
    channelId: string;
    latestMessageAt: string | null;
    unreadMentionCount: number;
  }>;
};

export type StudyGroupMember = {
  id?: string;
  group_id: string;
  user_id: string;
  role?: "owner" | "admin" | "member" | string | null;
  status?: "active" | "pending" | "invited" | string | null;
  created_at?: string | null;
  profiles?: ProfileSummary | ProfileSummary[] | null;
};

export type StudyGroupChannel = {
  id: string;
  group_id: string;
  name: string;
  type?: "text" | "code" | string | null;
  position?: number | null;
  created_at?: string | null;
};

export type StudyGroupMessage = {
  id: string;
  group_id: string;
  channel_id: string;
  user_id: string;
  content: string;
  kind?: "message" | "system" | string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  profiles?: ProfileSummary | ProfileSummary[] | null;
  reactions?: StudyGroupMessageReaction[];
};

export type StudyGroupSticker = {
  id: string;
  group_id: string;
  created_by: string;
  name: string;
  image_url: string;
  storage_path?: string | null;
  created_at?: string | null;
};

export type StudyGroupMessageReaction = {
  id?: string;
  group_id?: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at?: string | null;
  profiles?: ProfileSummary | ProfileSummary[] | null;
};

export type StudyGroupInvite = {
  id: string;
  group_id: string;
  token: string;
  created_by: string;
  created_at?: string | null;
  expires_at?: string | null;
  max_uses?: number | null;
  uses?: number | null;
  active?: boolean | null;
  study_groups?: StudyGroup | StudyGroup[] | null;
};

export type StudyGroupInvitePreview = {
  userId: string | null;
  invite: StudyGroupInvite | null;
  group: StudyGroup | null;
  membership: StudyGroupMember | null;
  memberCount: number;
  channelCount: number;
  expired: boolean;
  full: boolean;
};

export type StudyGroupsData = {
  userId: string | null;
  myGroups: StudyGroup[];
  publicGroups: StudyGroup[];
};

export type StudyGroupWorkspace = {
  userId: string | null;
  group: StudyGroup | null;
  membership: StudyGroupMember | null;
  channels: StudyGroupChannel[];
  members: StudyGroupMember[];
  stickers: StudyGroupSticker[];
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

  signInWithPassword(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password });
  }

  signUp(email: string, password: string) {
    return this.client.auth.signUp({ email, password });
  }

  signInWithGoogle(redirectTo: string) {
    return this.client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });
  }

  resetPasswordForEmail(email: string, redirectTo: string) {
    return this.client.auth.resetPasswordForEmail(email, { redirectTo });
  }

  updatePassword(password: string) {
    return this.client.auth.updateUser({ password });
  }
}

class ProfilesApi {
  constructor(private readonly client: SupabaseClient) {}

  private normalizeUsername(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24);
  }

  async ensureForUser(user: User): Promise<ProfileSummary> {
    const existing = await this.getProfile(user.id);
    if (existing) return existing;

    const metadata = user.user_metadata || {};
    const emailPrefix = user.email?.split("@")[0] || "";
    const preferredName =
      String(metadata.preferred_username || metadata.user_name || emailPrefix);
    const baseUsername = this.normalizeUsername(preferredName) || "user";

    const { data: usernameOwner, error: usernameError } = await this.client
      .from("profiles")
      .select("id")
      .eq("username", baseUsername)
      .maybeSingle<{ id: string }>();

    if (usernameError) throw usernameError;

    const username =
      usernameOwner && usernameOwner.id !== user.id
        ? `${baseUsername.slice(0, 17)}-${user.id.slice(0, 6)}`
        : baseUsername;

    const avatarUrl =
      typeof metadata.avatar_url === "string"
        ? metadata.avatar_url
        : typeof metadata.picture === "string"
          ? metadata.picture
          : null;

    const { data, error } = await this.client
      .from("profiles")
      .upsert(
        {
          id: user.id,
          username,
          avatar_url: avatarUrl,
          role: "user",
        },
        { onConflict: "id" }
      )
      .select("*")
      .single<ProfileSummary>();

    if (error) throw error;

    return data;
  }

  async saveRegistrationProfile(userId: string, username: string) {
    const { error } = await this.client.from("profiles").upsert({
      id: userId,
      username: username.trim().toLowerCase(),
      role: "user",
    });

    if (error) throw error;
  }

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
      .select("*")
      .eq("id", id)
      .maybeSingle<ProfileSummary>();

    if (error) throw error;

    return data || null;
  }

  async listSummaries(ids: string[]): Promise<ProfileSummary[]> {
    if (!ids.length) return [];

    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .in("id", ids);

    if (error) throw error;

    return data || [];
  }

  async listSuggested(excludeUserId: string): Promise<ProfileSummary[]> {
    const { data, error } = await this.client
      .from("profiles")
      .select("*")
      .neq("id", excludeUserId);

    if (error) throw error;

    return data || [];
  }

  async searchMentionCandidates(
    userId: string,
    query: string,
    limit = 12
  ): Promise<MentionCandidate[]> {
    const normalizedQuery = query.trim().replace(/[^a-zA-Z0-9_-]/g, "");
    const { data: followRows, error: followsError } = await this.client
      .from("follows")
      .select("following_id")
      .eq("follower_id", userId);

    if (followsError) throw followsError;

    const followingIds = new Set(
      ((followRows || []) as FollowRow[]).map((row) => row.following_id)
    );

    let profilesQuery = this.client
      .from("profiles")
      .select("*")
      .neq("id", userId)
      .not("username", "is", null)
      .order("username", { ascending: true })
      .limit(Math.max(limit * 3, 30));

    if (normalizedQuery) {
      profilesQuery = profilesQuery.ilike(
        "username",
        `%${normalizedQuery}%`
      );
    } else if (followingIds.size > 0) {
      profilesQuery = profilesQuery.in("id", [...followingIds]);
    } else {
      return [];
    }

    const { data, error } = await profilesQuery;
    if (error) throw error;

    return ((data || []) as ProfileSummary[])
      .filter(
        (profile): profile is ProfileSummary & { username: string } =>
          Boolean(profile.username)
      )
      .map((profile) => ({
        id: profile.id,
        username: profile.username,
        avatar_url: profile.avatar_url || null,
        isFollowing: followingIds.has(profile.id),
      }))
      .sort(
        (left, right) =>
          Number(right.isFollowing) - Number(left.isFollowing) ||
          left.username.localeCompare(right.username)
      )
      .slice(0, limit);
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

    const { data: post, error } = await this.client
      .from("posts")
      .insert({
        user_id: userId,
        content,
        code: code || null,
        image_url: imageUrl,
      })
      .select("id, user_id, content, code, image_url, created_at")
      .single<FeedPost>();

    if (error) throw error;

    const mentionedUsernames = extractMentionUsernames(content);

    if (mentionedUsernames.length > 0) {
      const [{ data: mentionedProfiles, error: profilesError }, actor] =
        await Promise.all([
          this.client
            .from("profiles")
            .select("id, username")
            .in("username", mentionedUsernames),
          this.profiles.getSummary(userId),
        ]);

      if (profilesError) {
        console.warn("Could not resolve mentioned users.", profilesError);
      } else {
        const recipients = (mentionedProfiles || []).filter(
          (profile) => profile.id !== userId
        );

        if (recipients.length > 0) {
          const { error: notificationError } = await this.client
            .from("notifications")
            .insert(
              recipients.map((profile) => ({
                user_id: profile.id,
                actor_id: userId,
                type: "post_mention",
                title: `${actor?.username || "Someone"} mentioned you in a post`,
                body: content.slice(0, 160),
                href: `/post/${post.id}`,
                metadata: {
                  postId: post.id,
                  username: actor?.username || null,
                  mentionedUsername: profile.username,
                },
              }))
            );

          if (notificationError) {
            console.warn(
              "Could not create mention notifications.",
              notificationError
            );
          }
        }
      }
    }

    return post;
  }

  async deletePost(postId: string) {
    const { error } = await this.client
      .from("posts")
      .delete()
      .eq("id", postId);

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

  async markGroupMentionsAsRead(userId: string, groupId: string) {
    const { data, error } = await this.client
      .from("notifications")
      .select("id, metadata")
      .eq("user_id", userId)
      .eq("type", "group_message")
      .is("read_at", null);

    if (error?.code === "42P01" || error?.code === "PGRST205") {
      console.warn("Notifications table is not available yet.", error);
      return;
    }

    if (error) throw error;

    const ids = (data || [])
      .filter((notification: { id: string; metadata?: Record<string, unknown> | null }) => {
        return notification.metadata?.groupId === groupId;
      })
      .map((notification: { id: string }) => notification.id);

    if (!ids.length) return;

    const { error: updateError } = await this.client
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .in("id", ids);

    if (updateError) throw updateError;
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
      .select("*")
      .limit(limit);

    if (error) throw error;

    return data || [];
  }

  async listProfilesByIds(ids: string[]): Promise<ProfileSummary[]> {
    if (!ids.length) return [];

    const { data, error } = await this.client
      .from("profiles")
      .select("*")
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

function normalizeGroupSlug(value: string) {
  const slug = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || `group-${Date.now().toString(36)}`;
}

function createInviteToken() {
  const randomPart =
    globalThis.crypto?.randomUUID?.().replace(/-/g, "") ||
    Math.random().toString(36).slice(2) + Date.now().toString(36);

  return randomPart.slice(0, 18);
}

function isRlsError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42501"
  );
}

function getJoinedProfile<T>(
  value: T | T[] | null | undefined
): T | null {
  return Array.isArray(value) ? value[0] || null : value || null;
}

class StudyGroupsApi {
  constructor(private readonly client: SupabaseClient) {}

  private async getGroupIdentity(groupId: string) {
    const { data, error } = await this.client
      .from("study_groups")
      .select("id, name, slug")
      .eq("id", groupId)
      .maybeSingle<{ id: string; name: string; slug: string }>();

    if (error) throw error;

    return data || null;
  }

  private async getDefaultChannelId(groupId: string) {
    const { data, error } = await this.client
      .from("study_group_channels")
      .select("id, name")
      .eq("group_id", groupId)
      .order("position", { ascending: true });

    if (error) throw error;

    return (
      data?.find((channel) => channel.name === "general")?.id ||
      data?.[0]?.id ||
      null
    );
  }

  private async insertSystemMessage(input: {
    groupId: string;
    channelId?: string | null;
    userId: string;
    content: string;
    metadata?: Record<string, unknown>;
  }) {
    const channelId =
      input.channelId || (await this.getDefaultChannelId(input.groupId));

    if (!channelId) return;

    const { error } = await this.client.from("study_group_messages").insert({
      group_id: input.groupId,
      channel_id: channelId,
      user_id: input.userId,
      content: input.content,
      kind: "system",
      metadata: input.metadata || {},
    });

    if (error) throw error;
  }

  private async notifyGroupMembers(input: {
    groupId: string;
    channelId: string;
    messageId?: string | null;
    senderId: string;
    content: string;
    locale?: "en" | "ro" | string;
  }) {
    const mentionedUsernames = extractMentionUsernames(input.content);

    if (!mentionedUsernames.length) return;

    const mentionedSet = new Set(mentionedUsernames);
    const [{ data: members, error: membersError }, group, sender] =
      await Promise.all([
        this.client
          .from("study_group_members")
          .select("user_id, profiles:user_id(username)")
          .eq("group_id", input.groupId)
          .eq("status", "active"),
        this.getGroupIdentity(input.groupId),
        new ProfilesApi(this.client).getSummary(input.senderId),
      ]);

    if (membersError) throw membersError;
    if (!group) return;

    const recipientIds = [
      ...new Set(
        (members || [])
          .filter(
            (member: {
              user_id?: string | null;
              profiles?:
                | { username?: string | null }
                | { username?: string | null }[]
                | null;
            }) => {
              const profile = getJoinedProfile(member.profiles);
              const username = profile?.username?.toLowerCase();

              return (
                Boolean(member.user_id) &&
                member.user_id !== input.senderId &&
                Boolean(username) &&
                mentionedSet.has(username || "")
              );
            }
          )
          .map((member: { user_id?: string | null }) => member.user_id)
          .filter(
            (userId): userId is string =>
              Boolean(userId) && userId !== input.senderId
          )
      ),
    ];

    if (!recipientIds.length) return;

    const actorName = sender?.username || "Someone";
    const preview =
      input.content.length > 120
        ? `${input.content.slice(0, 117).trim()}...`
        : input.content;
    const isRo = input.locale === "ro";

    const { error } = await this.client.from("notifications").insert(
      recipientIds.map((userId) => ({
        user_id: userId,
        actor_id: input.senderId,
        type: "group_message",
        title: isRo
          ? `${actorName} te-a menționat în ${group.name}`
          : `${actorName} mentioned you in ${group.name}`,
        body: preview,
        href: `/groups/${group.slug}`,
        metadata: {
          groupId: input.groupId,
          channelId: input.channelId,
          messageId: input.messageId || null,
          mentionedUsernames,
        },
      }))
    );

    if (error) {
      console.warn("Could not create group message notifications.", error);
    }
  }

  private async enrichGroups(
    groups: StudyGroup[],
    userId?: string | null
  ): Promise<StudyGroup[]> {
    if (!groups.length) return [];

    const groupIds = groups.map((group) => group.id);

    const [
      { data: memberRows, error: membersError },
      { data: channelRows, error: channelsError },
      { data: membershipRows, error: membershipError },
    ] = await Promise.all([
      this.client
        .from("study_group_members")
        .select("group_id")
        .in("group_id", groupIds)
        .eq("status", "active"),
      this.client
        .from("study_group_channels")
        .select("group_id")
        .in("group_id", groupIds),
      userId
        ? this.client
            .from("study_group_members")
            .select("group_id, role, status")
            .in("group_id", groupIds)
            .eq("user_id", userId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (membersError) throw membersError;
    if (channelsError) throw channelsError;
    if (membershipError) throw membershipError;

    const memberCounts = new Map<string, number>();
    const channelCounts = new Map<string, number>();
    const memberships = new Map<
      string,
      { group_id: string; role?: string | null; status?: string | null }
    >();

    (memberRows || []).forEach((row: { group_id: string }) => {
      memberCounts.set(row.group_id, (memberCounts.get(row.group_id) || 0) + 1);
    });

    (channelRows || []).forEach((row: { group_id: string }) => {
      channelCounts.set(row.group_id, (channelCounts.get(row.group_id) || 0) + 1);
    });

    (
      (membershipRows || []) as Array<{
        group_id: string;
        role?: string | null;
        status?: string | null;
      }>
    ).forEach((row) => {
      memberships.set(row.group_id, row);
    });

    return groups.map((group) => {
      const membership = memberships.get(group.id);

      return {
        ...group,
        member_count: memberCounts.get(group.id) || 0,
        channel_count: channelCounts.get(group.id) || 0,
        role: membership?.role || null,
        status: membership?.status || null,
      };
    });
  }

  async getGroupsData(): Promise<StudyGroupsData> {
    const { data: sessionData } = await this.client.auth.getSession();
    const userId = sessionData.session?.user?.id || null;

    const { data: publicData, error: publicError } = await this.client
      .from("study_groups")
      .select("*")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(30);

    if (publicError) throw publicError;

    let myGroups: StudyGroup[] = [];

    if (userId) {
      const { data: memberships, error: membershipError } = await this.client
        .from("study_group_members")
        .select("group_id, role, status, study_groups(*)")
        .eq("user_id", userId)
        .in("status", ["active", "pending", "invited"]);

      if (membershipError) throw membershipError;

      myGroups = ((memberships || []) as Array<{
        role?: string | null;
        status?: string | null;
        study_groups?: StudyGroup | StudyGroup[] | null;
      }>)
        .flatMap((row) => {
          const group = Array.isArray(row.study_groups)
            ? row.study_groups[0]
            : row.study_groups;

          if (!group) return [];

          return [{
            ...group,
            role: row.role || null,
            status: row.status || null,
          }];
        });
    }

    return {
      userId,
      myGroups: await this.enrichGroups(myGroups, userId),
      publicGroups: await this.enrichGroups(
        (publicData || []) as StudyGroup[],
        userId
      ),
    };
  }

  async listActivity(userId: string): Promise<StudyGroupActivitySummary[]> {
    const { data: memberships, error: membershipError } = await this.client
      .from("study_group_members")
      .select("group_id")
      .eq("user_id", userId)
      .eq("status", "active");

    if (membershipError) throw membershipError;

    const groupIds = [
      ...new Set(
        (memberships || [])
          .map((row: { group_id?: string | null }) => row.group_id)
          .filter((groupId): groupId is string => Boolean(groupId))
      ),
    ];

    if (!groupIds.length) return [];

    const [
      { data: messageRows, error: messagesError },
      { data: notificationRows, error: notificationsError },
    ] = await Promise.all([
      this.client
        .from("study_group_messages")
        .select("group_id, channel_id, created_at, user_id")
        .in("group_id", groupIds)
        .neq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(300),
      this.client
        .from("notifications")
        .select("id, metadata")
        .eq("user_id", userId)
        .eq("type", "group_message")
        .is("read_at", null),
    ]);

    if (messagesError) throw messagesError;

    if (
      notificationsError &&
      notificationsError.code !== "42P01" &&
      notificationsError.code !== "PGRST205"
    ) {
      throw notificationsError;
    }

    const latestMessageByGroup = new Map<string, string>();
    const latestMessageByChannel = new Map<string, Map<string, string>>();
    for (const row of (messageRows || []) as Array<{
      group_id?: string | null;
      channel_id?: string | null;
      created_at?: string | null;
    }>) {
      if (!row.group_id || !row.created_at) continue;
      if (!latestMessageByGroup.has(row.group_id)) {
        latestMessageByGroup.set(row.group_id, row.created_at);
      }

      if (row.channel_id) {
        const groupChannels =
          latestMessageByChannel.get(row.group_id) || new Map<string, string>();

        if (!groupChannels.has(row.channel_id)) {
          groupChannels.set(row.channel_id, row.created_at);
        }

        latestMessageByChannel.set(row.group_id, groupChannels);
      }
    }

    const mentionCounts = new Map<string, number>();
    const mentionCountsByChannel = new Map<string, Map<string, number>>();
    for (const notification of (notificationRows || []) as Array<{
      metadata?: Record<string, unknown> | null;
    }>) {
      const groupId =
        typeof notification.metadata?.groupId === "string"
          ? notification.metadata.groupId
          : null;
      const channelId =
        typeof notification.metadata?.channelId === "string"
          ? notification.metadata.channelId
          : null;

      if (!groupId) continue;

      mentionCounts.set(groupId, (mentionCounts.get(groupId) || 0) + 1);

      if (channelId) {
        const groupChannels =
          mentionCountsByChannel.get(groupId) || new Map<string, number>();

        groupChannels.set(channelId, (groupChannels.get(channelId) || 0) + 1);
        mentionCountsByChannel.set(groupId, groupChannels);
      }
    }

    return groupIds.map((groupId) => {
      const channelIds = new Set<string>([
        ...Array.from(latestMessageByChannel.get(groupId)?.keys() || []),
        ...Array.from(mentionCountsByChannel.get(groupId)?.keys() || []),
      ]);

      return {
        groupId,
        latestMessageAt: latestMessageByGroup.get(groupId) || null,
        unreadMentionCount: mentionCounts.get(groupId) || 0,
        channels: Array.from(channelIds).map((channelId) => ({
          channelId,
          latestMessageAt:
            latestMessageByChannel.get(groupId)?.get(channelId) || null,
          unreadMentionCount:
            mentionCountsByChannel.get(groupId)?.get(channelId) || 0,
        })),
      };
    });
  }

  async createGroup(input: {
    ownerId: string;
    name: string;
    description?: string | null;
    visibility: "public" | "private";
  }) {
    const baseSlug = normalizeGroupSlug(input.name);
    const slug = `${baseSlug}-${Date.now().toString(36).slice(-5)}`;

    const { data: group, error: groupError } = await this.client
      .from("study_groups")
      .insert({
        name: input.name.trim(),
        slug,
        description: input.description?.trim() || null,
        visibility: input.visibility,
        owner_id: input.ownerId,
      })
      .select()
      .single<StudyGroup>();

    if (groupError) throw groupError;

    const { error: memberError } = await this.client
      .from("study_group_members")
      .insert({
        group_id: group.id,
        user_id: input.ownerId,
        role: "owner",
        status: "active",
      });

    if (memberError) throw memberError;

    const defaultChannels = [
      { name: "general", type: "text", position: 0 },
      { name: "help", type: "text", position: 1 },
      { name: "solutions", type: "text", position: 2 },
      { name: "live-code", type: "code", position: 3 },
    ];

    const { error: channelError } = await this.client
      .from("study_group_channels")
      .insert(
        defaultChannels.map((channel) => ({
          ...channel,
          group_id: group.id,
        }))
      );

    if (channelError) throw channelError;

    return group;
  }

  async updateGroup(input: {
    groupId: string;
    name: string;
    description?: string | null;
    visibility: "public" | "private";
  }) {
    const { data, error } = await this.client
      .from("study_groups")
      .update({
        name: input.name.trim(),
        description: input.description?.trim() || null,
        visibility: input.visibility,
      })
      .eq("id", input.groupId)
      .select()
      .single<StudyGroup>();

    if (error) throw error;

    return data;
  }

  async createInviteLink(input: {
    groupId: string;
    userId: string;
    expiresAt?: string | null;
  }) {
    const token = createInviteToken();

    const { data, error } = await this.client
      .from("study_group_invites")
      .insert({
        group_id: input.groupId,
        token,
        created_by: input.userId,
        expires_at: input.expiresAt || null,
        active: true,
      })
      .select()
      .single<StudyGroupInvite>();

    if (error) {
      if (isRlsError(error)) {
        const { data: rpcData, error: rpcError } = await this.client.rpc(
          "create_study_group_invite_link",
          {
            p_group_id: input.groupId,
            p_token: token,
            p_expires_at: input.expiresAt || null,
          }
        );

        if (rpcError) throw rpcError;

        const invite = Array.isArray(rpcData) ? rpcData[0] : rpcData;
        return invite as StudyGroupInvite;
      }

      throw error;
    }

    return data;
  }

  async getInvitePreview(token: string): Promise<StudyGroupInvitePreview> {
    const { data: sessionData } = await this.client.auth.getSession();
    const userId = sessionData.session?.user?.id || null;

    const { data: invite, error: inviteError } = await this.client
      .from("study_group_invites")
      .select("*, study_groups(*)")
      .eq("token", token)
      .eq("active", true)
      .maybeSingle<StudyGroupInvite>();

    if (inviteError) throw inviteError;

    const group = getJoinedProfile(invite?.study_groups);

    if (!invite || !group) {
      return {
        userId,
        invite: invite || null,
        group: null,
        membership: null,
        memberCount: 0,
        channelCount: 0,
        expired: false,
        full: false,
      };
    }

    const [
      { count: memberCount, error: memberError },
      { count: channelCount, error: channelError },
      { data: membership, error: membershipError },
    ] = await Promise.all([
      this.client
        .from("study_group_members")
        .select("id", { count: "exact", head: true })
        .eq("group_id", group.id)
        .eq("status", "active"),
      this.client
        .from("study_group_channels")
        .select("id", { count: "exact", head: true })
        .eq("group_id", group.id),
      userId
        ? this.client
            .from("study_group_members")
            .select("*")
            .eq("group_id", group.id)
            .eq("user_id", userId)
            .maybeSingle<StudyGroupMember>()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (memberError) throw memberError;
    if (channelError) throw channelError;
    if (membershipError) throw membershipError;

    const expired = Boolean(
      invite.expires_at && Date.parse(invite.expires_at) < Date.now()
    );
    const full = Boolean(
      typeof invite.max_uses === "number" &&
        typeof invite.uses === "number" &&
        invite.uses >= invite.max_uses
    );

    return {
      userId,
      invite,
      group: {
        ...group,
        member_count: memberCount || 0,
        channel_count: channelCount || 0,
        role: membership?.role || null,
        status: membership?.status || null,
      },
      membership: membership || null,
      memberCount: memberCount || 0,
      channelCount: channelCount || 0,
      expired,
      full,
    };
  }

  async acceptInviteLink(token: string) {
    const { data, error } = await this.client.rpc(
      "accept_study_group_invite",
      { p_token: token }
    );

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;

    return result as {
      group_id: string;
      slug: string;
      status: string;
    } | null;
  }

  async getWorkspace(slug: string): Promise<StudyGroupWorkspace> {
    const { data: sessionData } = await this.client.auth.getSession();
    const userId = sessionData.session?.user?.id || null;

    let { data: group, error: groupError } = await this.client
      .from("study_groups")
      .select("*")
      .eq("slug", slug)
      .maybeSingle<StudyGroup>();

    if (groupError) throw groupError;

    let membershipFromGroupLookup: StudyGroupMember | null = null;

    if (!group && userId) {
      const { data: groupMembership, error: groupMembershipError } =
        await this.client
          .from("study_group_members")
          .select("*, study_groups!inner(*)")
          .eq("user_id", userId)
          .eq("study_groups.slug", slug)
          .maybeSingle<
            StudyGroupMember & {
              study_groups?: StudyGroup | StudyGroup[] | null;
            }
          >();

      if (groupMembershipError) throw groupMembershipError;

      const joinedGroup = getJoinedProfile(groupMembership?.study_groups);
      if (joinedGroup) {
        group = joinedGroup as StudyGroup;
        membershipFromGroupLookup = groupMembership as StudyGroupMember;
      }
    }

    if (!group) {
      return {
        userId,
        group: null,
        membership: null,
        channels: [],
        members: [],
        stickers: [],
      };
    }

    const [
      { data: channels, error: channelError },
      { data: members, error: memberError },
      { data: membership, error: membershipError },
      { data: stickers, error: stickerError },
    ] = await Promise.all([
      this.client
        .from("study_group_channels")
        .select("*")
        .eq("group_id", group.id)
        .order("position", { ascending: true }),
      this.client
        .from("study_group_members")
        .select("*, profiles(*)")
        .eq("group_id", group.id)
        .eq("status", "active")
        .order("created_at", { ascending: true }),
      userId
        ? membershipFromGroupLookup
          ? Promise.resolve({ data: membershipFromGroupLookup, error: null })
          : this.client
              .from("study_group_members")
              .select("*")
              .eq("group_id", group.id)
              .eq("user_id", userId)
              .maybeSingle<StudyGroupMember>()
        : Promise.resolve({ data: null, error: null }),
      this.client
        .from("study_group_stickers")
        .select("*")
        .eq("group_id", group.id)
        .order("created_at", { ascending: true }),
    ]);

    if (channelError) throw channelError;
    if (memberError) throw memberError;
    if (membershipError) throw membershipError;
    if (stickerError) {
      console.warn("Could not load study group stickers:", stickerError);
    }

    return {
      userId,
      group: {
        ...group,
        member_count: (members || []).length,
        channel_count: (channels || []).length,
        role: membership?.role || null,
        status: membership?.status || null,
      },
      membership: membership || null,
      channels: (channels || []) as StudyGroupChannel[],
      members: (members || []) as StudyGroupMember[],
      stickers: stickerError ? [] : ((stickers || []) as StudyGroupSticker[]),
    };
  }

  async listMessages(channelId: string): Promise<StudyGroupMessage[]> {
    const { data, error } = await this.client
      .from("study_group_messages")
      .select("*, profiles(*)")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) throw error;

    const messages = (data || []) as StudyGroupMessage[];
    const messageIds = messages.map((message) => message.id);

    if (!messageIds.length) return messages;

    const { data: reactions, error: reactionsError } = await this.client
      .from("study_group_message_reactions")
      .select("*, profiles(*)")
      .eq("group_id", messages[0]?.group_id)
      .in("message_id", messageIds);

    if (reactionsError) {
      console.warn("Could not load group message reactions:", reactionsError);
      return messages;
    }

    const reactionsByMessage = new Map<string, StudyGroupMessageReaction[]>();
    for (const reaction of (reactions || []) as StudyGroupMessageReaction[]) {
      const current = reactionsByMessage.get(reaction.message_id) || [];
      current.push(reaction);
      reactionsByMessage.set(reaction.message_id, current);
    }

    return messages.map((message) => ({
      ...message,
      reactions: reactionsByMessage.get(message.id) || [],
    }));
  }

  async sendMessage(input: {
    groupId: string;
    channelId: string;
    userId: string;
    content: string;
    kind?: "message" | "system" | "sticker";
    metadata?: Record<string, unknown>;
    notify?: boolean;
    locale?: "en" | "ro" | string;
  }) {
    const kind = input.kind || "message";
    const { data, error } = await this.client
      .from("study_group_messages")
      .insert({
        group_id: input.groupId,
        channel_id: input.channelId,
        user_id: input.userId,
        content: input.content,
        kind,
        metadata: input.metadata || {},
      })
      .select("id")
      .single<{ id: string }>();

    if (error) throw error;

    if (kind === "message" && input.notify !== false) {
      await this.notifyGroupMembers({
        groupId: input.groupId,
        channelId: input.channelId,
        messageId: data?.id || null,
        senderId: input.userId,
        content: input.content,
        locale: input.locale,
      });
    }
  }

  async createSticker(input: {
    groupId: string;
    userId: string;
    name: string;
    file: File;
  }): Promise<StudyGroupSticker> {
    const name = input.name.trim().slice(0, 32);
    if (!name) throw new Error("Sticker name is required");

    const extension = input.file.name.split(".").pop()?.toLowerCase() || "png";
    const safeExtension = ["png", "jpg", "jpeg", "webp", "gif"].includes(extension)
      ? extension
      : "png";
    const fileId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const storagePath = `${input.groupId}/${fileId}.${safeExtension}`;

    const { error: uploadError } = await this.client.storage
      .from("study-group-stickers")
      .upload(storagePath, input.file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = this.client.storage
      .from("study-group-stickers")
      .getPublicUrl(storagePath);

    const { data, error } = await this.client
      .from("study_group_stickers")
      .insert({
        group_id: input.groupId,
        created_by: input.userId,
        name,
        image_url: publicUrlData.publicUrl,
        storage_path: storagePath,
      })
      .select("*")
      .single<StudyGroupSticker>();

    if (error) throw error;

    return data;
  }

  async deleteSticker(input: {
    groupId: string;
    stickerId: string;
    storagePath?: string | null;
  }) {
    const { error } = await this.client
      .from("study_group_stickers")
      .delete()
      .eq("id", input.stickerId)
      .eq("group_id", input.groupId);

    if (error) throw error;

    if (input.storagePath) {
      const { error: storageError } = await this.client.storage
        .from("study-group-stickers")
        .remove([input.storagePath]);

      if (storageError) {
        console.warn("Could not remove sticker file:", storageError);
      }
    }
  }

  async sendSticker(input: {
    groupId: string;
    channelId: string;
    userId: string;
    sticker: StudyGroupSticker;
  }) {
    await this.sendMessage({
      groupId: input.groupId,
      channelId: input.channelId,
      userId: input.userId,
      content: input.sticker.name,
      kind: "sticker",
      metadata: {
        stickerId: input.sticker.id,
        stickerName: input.sticker.name,
        stickerUrl: input.sticker.image_url,
      },
      notify: false,
    });
  }

  async toggleMessageReaction(input: {
    groupId: string;
    messageId: string;
    userId: string;
    emoji: string;
  }) {
    const emoji = input.emoji.trim();
    if (!emoji) return;

    const { data: existing, error: existingError } = await this.client
      .from("study_group_message_reactions")
      .select("id")
      .eq("group_id", input.groupId)
      .eq("message_id", input.messageId)
      .eq("user_id", input.userId)
      .eq("emoji", emoji)
      .maybeSingle<{ id: string }>();

    if (existingError) throw existingError;

    if (existing?.id) {
      const { error } = await this.client
        .from("study_group_message_reactions")
        .delete()
        .eq("id", existing.id);

      if (error) throw error;
      return "removed";
    }

    const { error } = await this.client
      .from("study_group_message_reactions")
      .insert({
        group_id: input.groupId,
        message_id: input.messageId,
        user_id: input.userId,
        emoji,
      });

    if (error) throw error;
    return "added";
  }

  async updateMessage(input: {
    groupId: string;
    messageId: string;
    userId: string;
    content: string;
  }) {
    const content = input.content.trim();
    if (!content) throw new Error("Message cannot be empty");

    const { data: existing, error: existingError } = await this.client
      .from("study_group_messages")
      .select("metadata, kind")
      .eq("id", input.messageId)
      .eq("group_id", input.groupId)
      .eq("user_id", input.userId)
      .maybeSingle<{
        metadata?: Record<string, unknown> | null;
        kind?: string | null;
      }>();

    if (existingError) throw existingError;
    if (!existing || existing.kind === "system") {
      throw new Error("Message cannot be edited");
    }

    const { error } = await this.client
      .from("study_group_messages")
      .update({
        content,
        metadata: {
          ...(existing.metadata || {}),
          edited: true,
          edited_at: new Date().toISOString(),
        },
      })
      .eq("id", input.messageId)
      .eq("group_id", input.groupId)
      .eq("user_id", input.userId);

    if (error) throw error;
  }

  async deleteMessage(input: {
    groupId: string;
    messageId: string;
  }) {
    const { error: reactionsError } = await this.client
      .from("study_group_message_reactions")
      .delete()
      .eq("group_id", input.groupId)
      .eq("message_id", input.messageId);

    if (reactionsError) throw reactionsError;

    const { error } = await this.client
      .from("study_group_messages")
      .delete()
      .eq("id", input.messageId)
      .eq("group_id", input.groupId);

    if (error) throw error;
  }

  async joinGroup(
    groupId: string,
    userId: string,
    visibility?: string | null,
    locale?: "en" | "ro" | string
  ) {
    const { data: existing, error: existingError } = await this.client
      .from("study_group_members")
      .select("status")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle<{ status?: string | null }>();

    if (existingError) throw existingError;

    if (existing?.status === "active") {
      return "active";
    }

    const status =
      existing?.status === "invited"
        ? "active"
        : visibility === "private"
          ? "pending"
          : "active";

    if (existing) {
      const { error } = await this.client
        .from("study_group_members")
        .update({ status })
        .eq("group_id", groupId)
        .eq("user_id", userId);

      if (error) throw error;
    } else {
      const { error } = await this.client.from("study_group_members").insert({
        group_id: groupId,
        user_id: userId,
        role: "member",
        status,
      });

      if (error) throw error;
    }

    if (status === "active") {
      const profile = await new ProfilesApi(this.client).getSummary(userId);
      const username = profile?.username || "user";
      await this.insertSystemMessage({
        groupId,
        userId,
        content:
          locale === "ro"
            ? `${username} a intrat în grup`
            : `${username} joined the group`,
        metadata: { event: "member_joined", userId },
      });
    }

    return status;
  }

  async inviteMember(input: {
    groupId: string;
    inviterId: string;
    inviteeId: string;
    locale?: "en" | "ro" | string;
  }) {
    const [
      group,
      inviter,
      invitee,
      { data: existing, error: existingError },
    ] = await Promise.all([
      this.getGroupIdentity(input.groupId),
      new ProfilesApi(this.client).getSummary(input.inviterId),
      new ProfilesApi(this.client).getSummary(input.inviteeId),
      this.client
        .from("study_group_members")
        .select("status")
        .eq("group_id", input.groupId)
        .eq("user_id", input.inviteeId)
        .maybeSingle<{ status?: string | null }>(),
    ]);

    if (!group) throw new Error("Group not found");

    if (existing?.status === "active") {
      return "active";
    }

    if (existing?.status === "invited") {
      return "invited";
    }

    const { error } = existingError
      ? { error: existingError }
      : await this.client
          .from("study_group_members")
          .upsert(
            {
              group_id: input.groupId,
              user_id: input.inviteeId,
              role: "member",
              status: "invited",
            },
            { onConflict: "group_id,user_id" }
          );

    if (error) {
      if (isRlsError(error)) {
        const { error: rpcError } = await this.client.rpc(
          "invite_study_group_member",
          {
            p_group_id: input.groupId,
            p_invitee_id: input.inviteeId,
          }
        );

        if (rpcError) throw rpcError;
      } else {
        throw error;
      }
    }

    const isRo = input.locale === "ro";
    await NotificationsApi.createWithClient(this.client, {
      userId: input.inviteeId,
      actorId: input.inviterId,
      type: "group_invite",
      title: isRo
        ? `Ai fost invitat în ${group.name}`
        : `You were invited to ${group.name}`,
      body: isRo
        ? `${inviter?.username || "Someone"} te-a invitat să intri în grup.`
        : `${inviter?.username || "Someone"} invited you to join this group.`,
      href: `/groups/${group.slug}`,
      metadata: {
        groupId: input.groupId,
        inviteeId: input.inviteeId,
        inviteeUsername: invitee?.username || null,
      },
    });

    return "invited";
  }

  async createChannel(input: {
    groupId: string;
    userId: string;
    name: string;
    type?: "text" | "code";
  }) {
    await this.ensureGroupOwner(input.groupId, input.userId);

    const { data: existing, error: countError } = await this.client
      .from("study_group_channels")
      .select("id")
      .eq("group_id", input.groupId);

    if (countError) throw countError;

    const { data, error } = await this.client
      .from("study_group_channels")
      .insert({
        group_id: input.groupId,
        name: normalizeGroupSlug(input.name),
        type: input.type || "text",
        position: existing?.length || 0,
      })
      .select()
      .single<StudyGroupChannel>();

    if (error) throw error;

    return data;
  }

  async deleteChannel(input: {
    groupId: string;
    channelId: string;
    userId: string;
  }) {
    await this.ensureGroupOwner(input.groupId, input.userId);

    const { data: channels, error: channelsError } = await this.client
      .from("study_group_channels")
      .select("id")
      .eq("group_id", input.groupId);

    if (channelsError) throw channelsError;
    if ((channels || []).length <= 1) {
      throw new Error("Cannot delete the last channel");
    }

    const { data: messages, error: messagesError } = await this.client
      .from("study_group_messages")
      .select("id")
      .eq("group_id", input.groupId)
      .eq("channel_id", input.channelId);

    if (messagesError) throw messagesError;

    const messageIds = (messages || []).map((message) => message.id);

    if (messageIds.length) {
      const { error: reactionsError } = await this.client
        .from("study_group_message_reactions")
        .delete()
        .eq("group_id", input.groupId)
        .in("message_id", messageIds);

      if (reactionsError) throw reactionsError;

      const { error: messagesDeleteError } = await this.client
        .from("study_group_messages")
        .delete()
        .eq("group_id", input.groupId)
        .eq("channel_id", input.channelId);

      if (messagesDeleteError) throw messagesDeleteError;
    }

    const { error } = await this.client
      .from("study_group_channels")
      .delete()
      .eq("group_id", input.groupId)
      .eq("id", input.channelId);

    if (error) throw error;
  }

  private async ensureGroupOwner(groupId: string, userId: string) {
    const { data, error } = await this.client
      .from("study_group_members")
      .select("role,status")
      .eq("group_id", groupId)
      .eq("user_id", userId)
      .maybeSingle<{ role?: string | null; status?: string | null }>();

    if (error) throw error;
    if (data?.role !== "owner" || data?.status !== "active") {
      throw new Error("Only the group owner can manage channels");
    }
  }

  async startLiveSessionFromChannel(input: {
    groupName: string;
    groupId: string;
    channelId: string;
    userId: string;
  }) {
    const room = await new LiveApi(this.client).createRoom(
      input.userId,
      `${input.groupName} live`
    );

    await this.sendMessage({
      groupId: input.groupId,
      channelId: input.channelId,
      userId: input.userId,
      content: `Started a live coding session: /live/${room.id}`,
      kind: "system",
      metadata: { event: "live_session_started", roomId: room.id },
      notify: false,
    });

    return room;
  }

  getMessageProfile(message: StudyGroupMessage) {
    return getJoinedProfile(message.profiles);
  }

  getMemberProfile(member: StudyGroupMember) {
    return getJoinedProfile(member.profiles);
  }
}

class AppApi {
  readonly auth: AuthApi;
  readonly profiles: ProfilesApi;
  readonly feed: FeedApi;
  readonly live: LiveApi;
  readonly notifications: NotificationsApi;
  readonly dailyChallenges: DailyChallengesApi;
  readonly groups: StudyGroupsApi;

  constructor(private readonly client: SupabaseClient) {
    this.auth = new AuthApi(client);
    this.profiles = new ProfilesApi(client);
    this.feed = new FeedApi(client, this.profiles);
    this.live = new LiveApi(client);
    this.notifications = new NotificationsApi(client, this.profiles);
    this.dailyChallenges = new DailyChallengesApi(client);
    this.groups = new StudyGroupsApi(client);
  }
}

export const api = new AppApi(supabase);

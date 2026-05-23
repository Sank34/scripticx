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
      .select("id, status")
      .eq("room_id", roomId)
      .eq("user_id", userId)
      .maybeSingle<RoomParticipant>();

    if (error) throw error;

    return data || null;
  }

  async inviteUser(roomId: string, userId: string) {
    const { error } = await this.client.from("room_participants").insert({
      room_id: roomId,
      user_id: userId,
      status: "invited",
    });

    if (error) throw error;
  }

  async markLiveParticipant(roomId: string, userId: string) {
    const { error } = await this.client.from("live_participants").upsert({
      room_id: roomId,
      user_id: userId,
    });

    if (error) throw error;
  }

  async joinRoom(roomId: string, userId: string) {
    const { error } = await this.client
      .from("room_participants")
      .insert({
        room_id: roomId,
        user_id: userId,
      })
      .select()
      .single();

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
      .select("user_id")
      .eq("room_id", roomId);

    if (error) throw error;

    return (data || []) as Array<{ user_id: string }>;
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

    const { data: participants, error: participantsError } = await this.client
      .from("live_participants")
      .select("room_id, user_id")
      .in("room_id", roomIds);

    if (participantsError) throw participantsError;

    const ownerIds = rooms.map((room) => room.owner_id);
    const userIds = [
      ...new Set([
        ...((participants || []) as Array<{ user_id: string }>).map(
          (participant) => participant.user_id
        ),
        ...ownerIds,
      ]),
    ];

    const profiles = await this.listProfilesByIds(userIds);
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const grouped: Record<string, ProfileSummary[]> = {};

    rooms.forEach((room) => {
      grouped[room.id] = [];
    });

    ((participants || []) as Array<{ room_id: string; user_id: string }>).forEach(
      (participant) => {
        const profile = profileMap.get(participant.user_id);
        if (profile) grouped[participant.room_id]?.push(profile);
      }
    );

    rooms.forEach((room) => {
      if (!grouped[room.id]?.length) {
        const ownerProfile = profileMap.get(room.owner_id);
        if (ownerProfile) grouped[room.id] = [ownerProfile];
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

class AppApi {
  readonly auth: AuthApi;
  readonly profiles: ProfilesApi;
  readonly feed: FeedApi;
  readonly live: LiveApi;

  constructor(private readonly client: SupabaseClient) {
    this.auth = new AuthApi(client);
    this.profiles = new ProfilesApi(client);
    this.feed = new FeedApi(client, this.profiles);
    this.live = new LiveApi(client);
  }
}

export const api = new AppApi(supabase);

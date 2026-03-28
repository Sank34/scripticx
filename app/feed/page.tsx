"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import RouteGuard from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

import { Heart, MessageCircle, Share2, Code2 } from "lucide-react";

import { toast } from "sonner";
import Link from "next/link";

function FeedContent() {
  const { user } = useAuth();

  const [posts, setPosts] = useState<any[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());

  async function fetchPosts() {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    const postsWithProfiles = await Promise.all(
      (data || []).map(async (p) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", p.user_id)
          .maybeSingle();

        return {
          ...p,
          profiles: profile,
        };
      })
    );

    setPosts(postsWithProfiles);
    setLoading(false);

    const postIds = (data || []).map((p) => p.id);

    if (postIds.length) {
      const { data: commentsData } = await supabase
        .from("comments")
        .select("post_id")
        .in("post_id", postIds);

      const counts: Record<string, number> = {};
      commentsData?.forEach((c: any) => {
        counts[c.post_id] = (counts[c.post_id] || 0) + 1;
      });

      setCommentCounts(counts);
    } else {
      setCommentCounts({});
    }

    if (!user) {
      setLikes({});
      setLiked({});
      return;
    }

    if (postIds.length) {
      const { data: likesData } = await supabase
        .from("post_likes")
        .select("post_id, user_id")
        .in("post_id", postIds);

      const counts: Record<string, number> = {};
      const likedMap: Record<string, boolean> = {};

      likesData?.forEach((l: any) => {
        counts[l.post_id] = (counts[l.post_id] || 0) + 1;
        if (l.user_id === user?.id) {
          likedMap[l.post_id] = true;
        }
      });

      setLikes(counts);
      setLiked(likedMap);
    }

    // Fetch following list
    const { data: followingData } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", user?.id);

    const followingSet = new Set(
      (followingData || []).map((f: any) => f.following_id)
    );

    setFollowing(followingSet);

    const { data: usersData } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .neq("id", user?.id);

    const filtered =
      (usersData || [])
        .filter((u: any) => !followingSet.has(u.id))
        .slice(0, 5);

    setSuggested(filtered);
  }
  async function toggleLike(postId: string) {
    if (!user) return;

    if (liked[postId]) {
      await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);

      setLiked((prev) => ({ ...prev, [postId]: false }));
      setLikes((prev) => ({ ...prev, [postId]: (prev[postId] || 1) - 1 }));
    } else {
      await supabase
        .from("post_likes")
        .insert([{ post_id: postId, user_id: user.id }]);

      setLiked((prev) => ({ ...prev, [postId]: true }));
      setLikes((prev) => ({ ...prev, [postId]: (prev[postId] || 0) + 1 }));
    }
  }

  async function handleShare(postId: string) {
    const url = `${window.location.origin}/post/${postId}`;
    await navigator.clipboard.writeText(url);
    toast.success("Link copied!");
  }

  useEffect(() => {
    if (user) {
      fetchPosts();
    }
  }, [user]);

  async function createPost() {
    if (!content.trim() || !user) return;

    setPosting(true);

    let imageUrl = null;

    if (image) {
      const ext = image.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("posts")
        .upload(fileName, image);

      if (uploadError) {
        // console.error("Upload error:", uploadError);
        toast.error("Image upload failed");
      }

      if (!uploadError) {
        const { data } = supabase.storage
          .from("posts")
          .getPublicUrl(fileName);

        // console.log("Public URL:", data.publicUrl);
        imageUrl = data.publicUrl;
      }
    }

    const { error } = await supabase
      .from("posts")
      .insert([
        {
          user_id: user.id,
          content,
          code: code || null,
          image_url: imageUrl,
        },
      ]);

    setPosting(false);

    if (error) {
      toast.error("Failed to post");
      return;
    }

    setContent("");
    setCode("");
    setShowCode(false);
    setImage(null);
    fetchPosts();
    toast.success("Posted!");
    setOpen(false);
  }

  async function followUser(userId: string) {
    if (!user) return;

    if (following.has(userId)) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", userId);

      setFollowing((prev) => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });

      setSuggested((prev) => [...prev, suggested.find((u) => u.id === userId)].filter(Boolean));
      toast.success("Unfollowed");
    } else {
      await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: userId,
      });

      setFollowing((prev) => new Set(prev).add(userId));
      setSuggested((prev) => prev.filter((u) => u.id !== userId));
      toast.success("Followed!");
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Feed</h1>
          <span className="text-sm text-muted-foreground">
            {posts.length} posts
          </span>
        </div>

        <p className="text-sm text-muted-foreground mt-1">
          Discover what others are building with MiniScript+ 
        </p>

        <div className="border-b mt-4" />
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              What's on your mind?
            </p>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>Create Post</Button>
              </DialogTrigger>

              <DialogContent className="!p-0">
                <div className="p-5 space-y-4">
                  <DialogTitle className="mt-0">Create Post</DialogTitle>

                  <div className="flex items-center gap-3">
                    <Avatar>
                      {user?.user_metadata?.avatar_url && (
                        <AvatarImage src={user.user_metadata.avatar_url} />
                      )}
                      <AvatarFallback>
                        {(user?.email || "U")[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="text-sm text-muted-foreground">
                      {user?.email}
                    </div>
                  </div>

                  <Textarea
                    placeholder="What's on your mind?"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[120px]"
                  />

                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setShowCode((v) => !v)}
                      className="flex items-center gap-2 text-sm hover:opacity-80"
                    >
                      <Code2 size={16} />
                      {showCode ? "Remove code" : "Add code"}
                    </button>
                  </div>

                  {showCode && (
                    <Textarea
                      placeholder="Paste your code here..."
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="min-h-[140px] font-mono mt-2"
                    />
                  )}

                  <div
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) setImage(file);
                    }}
                    onClick={() => {
                      document.getElementById("image-upload")?.click();
                    }}
                  >
                    <p className="text-sm font-medium">Drag & drop an image here</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      or click to browse
                    </p>

                    {image && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        Selected: {image.name}
                      </p>
                    )}

                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setImage(e.target.files?.[0] || null)}
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      onClick={createPost}
                      disabled={posting}
                      className="w-full"
                    >
                      {posting ? "Posting..." : "Post"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">Suggested users</p>

          {suggested.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No suggestions yet.
            </p>
          )}

          {suggested.map((u) => (
            <div key={u.id} className="flex items-center justify-between">
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => (window.location.href = `/u/${u.username}`)}
              >
                <Avatar>
                  {u.avatar_url && <AvatarImage src={u.avatar_url} />}
                  <AvatarFallback>
                    {(u.username || "U")[0]}
                  </AvatarFallback>
                </Avatar>

                <p className="text-sm font-medium">{u.username}</p>
              </div>

              <Button
                size="sm"
                variant={following.has(u.id) ? "secondary" : "default"}
                onClick={() => followUser(u.id)}
              >
                {following.has(u.id) ? "Unfollow" : "Follow"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {loading &&
        Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}

      {!loading && posts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No posts yet. Be the first to share something!
        </div>
      )}

      {!loading &&
        posts.map((p) => (
          <Card key={p.id} className="hover:shadow-sm transition">
            <Link href={`/post/${p.id}`}>
              <CardHeader className="flex flex-row items-center gap-3 cursor-pointer">

                <Avatar>
                  {p.profiles?.avatar_url && (
                    <AvatarImage src={p.profiles.avatar_url} />
                  )}
                  <AvatarFallback>
                    {(p.profiles?.username || "U")[0]}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <p
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/u/${p.profiles?.username}`;
                    }}
                    className="font-medium hover:underline cursor-pointer"
                  >
                    {p.profiles?.username || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString()}
                  </p>
                </div>

              </CardHeader>

              <CardContent className="space-y-3 cursor-pointer pt-4">
                <p className="whitespace-pre-wrap">{p.content}</p>

                {p.image_url && (
                  <img
                    src={p.image_url}
                    className="rounded-lg max-h-[400px] object-cover w-full mt-2"
                  />
                )}

                {p.code && (
                  <pre className="bg-muted p-3 rounded text-sm overflow-auto font-mono">
                    {p.code}
                  </pre>
                )}
              </CardContent>
            </Link>

            <div className="px-6 pb-5 pt-1 flex items-center gap-4 text-sm">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLike(p.id);
                }}
                className="flex items-center gap-1 hover:opacity-80"
              >
                <Heart
                  size={16}
                  className={`transition-transform duration-150 ${
                    liked[p.id]
                      ? "fill-red-500 text-red-500 scale-110"
                      : "scale-100"
                  } active:scale-125`}
                />
                <span>{likes[p.id] || 0}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `/post/${p.id}`;
                }}
                className="flex items-center gap-1 hover:opacity-80"
              >
                <MessageCircle size={16} />
                <span>{commentCounts[p.id] || 0}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare(p.id);
                }}
                className="flex items-center gap-1 hover:opacity-80"
              >
                <Share2 size={16} />
                <span>Share</span>
              </button>
            </div>
          </Card>
        ))}

    </div>
  );
}

export default function FeedPage() {
  return (
    <RouteGuard requireAuth>
      <FeedContent />
    </RouteGuard>
  );
}
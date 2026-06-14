 "use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type FeedData, type FeedPost } from "@/lib/api";
import RouteGuard from "@/components/RouteGuard";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { translations } from "@/lib/i18n";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { Code2, MessageCircle } from "lucide-react";

import { toast } from "sonner";
import { useRouter } from "next/navigation";

function FeedContent() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { locale } = useLanguage();

  const t = (key: string) => {
    const keys = key.split(".");

    let value: any = translations[locale];
    for (const k of keys) value = value?.[k];

    if (value) return value;

    // fallback to English
    let fallback: any = translations["en"];
    for (const k of keys) fallback = fallback?.[k];

    return fallback || key;
  };

  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [postToDelete, setPostToDelete] = useState<FeedPost | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);

  async function fetchFeedData(): Promise<FeedData> {
    if (!user) {
      return {
        posts: [],
        likes: {},
        liked: {},
        commentCounts: {},
        suggested: [],
        following: new Set<string>(),
      };
    }

    return api.feed.getFeedData(user.id);
  }

  const {
    data: feedData,
    isLoading: loading,
  } = useQuery<FeedData>({
    queryKey: ["feed", user?.id],
    queryFn: fetchFeedData,
    enabled: !!user,
  });

  const posts = feedData?.posts || [];
  const likes = feedData?.likes || {};
  const liked = feedData?.liked || {};
  const commentCounts = feedData?.commentCounts || {};
  const suggested = feedData?.suggested || [];
  const following = feedData?.following || new Set<string>();
  async function toggleLike(postId: string) {
    if (!user) return;

    await api.feed.toggleLike(postId, user.id, Boolean(liked[postId]));

    await queryClient.invalidateQueries({
      queryKey: ["feed", user.id],
    });
  }

  async function handleShare(postId: string) {
    const url = `${window.location.origin}/post/${postId}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("feed.linkCopied"));
  }


  async function createPost() {
    if (!content.trim() || !user) return;

    setPosting(true);

    try {
      await api.feed.createPost({
        userId: user.id,
        content,
        code,
        image,
      });
    } catch {
      setPosting(false);
      toast.error(t("feed.failedToPost"));
      return;
    }

    setPosting(false);
    setContent("");
    setCode("");
    setShowCode(false);
    setImage(null);
    await queryClient.invalidateQueries({
      queryKey: ["feed", user.id],
    });
    toast.success(t("feed.posted"));
    setOpen(false);
  }

  async function followUser(userId: string) {
    if (!user) return;

    const isFollowing = following.has(userId);

    await api.feed.toggleFollow(user.id, userId, isFollowing);
    toast.success(t(isFollowing ? "feed.unfollowed" : "feed.followed"));

    await queryClient.invalidateQueries({
      queryKey: ["feed", user.id],
    });
  }

  async function deletePost() {
    if (!user || !isAdmin || !postToDelete || deletingPost) return;

    setDeletingPost(true);

    try {
      await api.feed.deletePost(postToDelete.id);

      queryClient.setQueryData<FeedData>(
        ["feed", user.id],
        (current) => {
          if (!current) return current;

          const nextLikes = { ...current.likes };
          const nextLiked = { ...current.liked };
          const nextCommentCounts = { ...current.commentCounts };

          delete nextLikes[postToDelete.id];
          delete nextLiked[postToDelete.id];
          delete nextCommentCounts[postToDelete.id];

          return {
            ...current,
            posts: current.posts.filter((post) => post.id !== postToDelete.id),
            likes: nextLikes,
            liked: nextLiked,
            commentCounts: nextCommentCounts,
          };
        }
      );

      setPostToDelete(null);
      toast.success(t("feed.deleted"));

      await queryClient.invalidateQueries({
        queryKey: ["feed", user.id],
      });
    } catch (error) {
      console.error("Failed to delete post:", error);
      toast.error(t("feed.deleteFailed"));
    } finally {
      setDeletingPost(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">

      <div>
        <PageHeader
          title={t("feed.title")}
          subtitle={t("feed.subtitle")}
          meta={`${posts.length} ${t("feed.posts")}`}
        />
        <div className="border-b mt-4" />
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              {t("feed.whatsOnYourMind")}
            </p>

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>{t("feed.createPost")}</Button>
              </DialogTrigger>

              <DialogContent className="!p-0">
                <div className="p-5 space-y-4">
                  <DialogTitle className="mt-0">{t("feed.createPost")}</DialogTitle>

                  <div className="flex items-center gap-3">
                    <UserAvatar
                      avatarUrl={user?.user_metadata?.avatar_url}
                      email={user?.email}
                    />

                    <div className="text-sm text-muted-foreground">
                      {user?.email}
                    </div>
                  </div>

                  <Textarea
                    placeholder={t("feed.whatsOnYourMind")}
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
                      {showCode ? t("feed.removeCode") : t("feed.addCode")}
                    </button>
                  </div>

                  {showCode && (
                    <Textarea
                      placeholder={t("feed.pasteCode")}
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
                    <p className="text-sm font-medium">{t("feed.dragDrop")}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("feed.orClick")}
                    </p>

                    {image && (
                      <p className="mt-3 text-xs text-muted-foreground">
                        {t("feed.selected")}: {image.name}
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
                      {posting ? t("feed.posting") : t("feed.post")}
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
          <p className="text-sm font-medium">{t("feed.suggestedUsers")}</p>

          {suggested.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("feed.noSuggestions")}
            </p>
          )}

          {suggested.map((u) => (
            <div key={u.id} className="flex items-center justify-between">
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => router.push(`/u/${u.username}`)}
              >
                <UserAvatar avatarUrl={u.avatar_url} username={u.username} />

                <p className="text-sm font-medium">{u.username}</p>
              </div>

              <Button
                size="sm"
                variant={following.has(u.id) ? "secondary" : "default"}
                onClick={() => followUser(u.id)}
              >
                {following.has(u.id) ? t("feed.unfollow") : t("feed.follow")}
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
        <EmptyState
          icon={<MessageCircle className="h-6 w-6" />}
          title={t("feed.noPosts")}
        />
      )}

      {!loading &&
        posts.map((p) => (
          <FeedPostCard
            key={p.id}
            commentCount={commentCounts[p.id] || 0}
            isAdmin={isAdmin}
            isLiked={Boolean(liked[p.id])}
            labels={{
              deletePost: t("feed.deletePost"),
              share: t("feed.share"),
            }}
            likeCount={likes[p.id] || 0}
            onAuthorOpen={(username) => router.push(`/u/${username}`)}
            onCommentsOpen={(postId) => router.push(`/post/${postId}`)}
            onDelete={setPostToDelete}
            onShare={handleShare}
            onToggleLike={toggleLike}
            post={p}
          />
        ))}

      <AlertDialog
        open={Boolean(postToDelete)}
        onOpenChange={(isOpen) => {
          if (!isOpen && !deletingPost) setPostToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("feed.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("feed.deleteDialog.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingPost}>
              {t("feed.deleteDialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingPost}
              onClick={(event) => {
                event.preventDefault();
                void deletePost();
              }}
            >
              {deletingPost
                ? t("feed.deleteDialog.deleting")
                : t("feed.deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

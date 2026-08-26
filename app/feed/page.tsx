"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Code2,
  ImagePlus,
  MessageCircle,
  PenLine,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";

import { api, type FeedData, type FeedPost } from "@/lib/api";
import RouteGuard from "@/components/RouteGuard";
import { EmptyState } from "@/components/common/EmptyState";
import { FeedPostCard } from "@/components/feed/FeedPostCard";
import { FeedPostSkeleton } from "@/components/feed/FeedPageSkeleton";
import { MentionTextarea } from "@/components/feed/MentionTextarea";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { PageHeader } from "@/components/common/PageHeader";

function FeedContent() {
  const { user, profile, isAdmin } = useAuth();
  const { locale, t } = useLanguage();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [image, setImage] = useState<File | null>(null);
  const [postToDelete, setPostToDelete] = useState<FeedPost | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);

  const { data: feedData, isLoading: loading } = useQuery<FeedData>({
    queryKey: ["feed", user?.id],
    queryFn: () => {
      if (!user) {
        return Promise.resolve({
          posts: [],
          likes: {},
          liked: {},
          commentCounts: {},
          suggested: [],
          following: new Set<string>(),
        });
      }

      return api.feed.getFeedData(user.id);
    },
    enabled: Boolean(user),
  });

  const posts = feedData?.posts || [];
  const likes = feedData?.likes || {};
  const liked = feedData?.liked || {};
  const commentCounts = feedData?.commentCounts || {};
  const suggested = feedData?.suggested || [];
  const following = feedData?.following || new Set<string>();
  const codeShareCount = posts.filter((post) => Boolean(post.code)).length;

  function openComposer(withCode = false) {
    if (withCode) setShowCode(true);
    setComposerOpen(true);
  }

  async function toggleLike(postId: string) {
    if (!user) return;

    await api.feed.toggleLike(postId, user.id, Boolean(liked[postId]));
    await queryClient.invalidateQueries({ queryKey: ["feed", user.id] });
  }

  async function handleShare(postId: string) {
    const url = `${window.location.origin}/post/${postId}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("feed.linkCopied"));
  }

  async function createPost() {
    if (!content.trim() || !user || posting) return;

    setPosting(true);

    try {
      await api.feed.createPost({
        userId: user.id,
        content,
        code,
        image,
      });

      setContent("");
      setCode("");
      setShowCode(false);
      setImage(null);
      setComposerOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["feed", user.id] });
      toast.success(t("feed.posted"));
    } catch {
      toast.error(t("feed.failedToPost"));
    } finally {
      setPosting(false);
    }
  }

  async function followUser(userId: string) {
    if (!user) return;

    const isFollowing = following.has(userId);
    await api.feed.toggleFollow(user.id, userId, isFollowing);
    toast.success(t(isFollowing ? "feed.unfollowed" : "feed.followed"));
    await queryClient.invalidateQueries({ queryKey: ["feed", user.id] });
  }

  async function deletePost() {
    if (!user || !isAdmin || !postToDelete || deletingPost) return;

    setDeletingPost(true);

    try {
      await api.feed.deletePost(postToDelete.id);

      queryClient.setQueryData<FeedData>(["feed", user.id], (current) => {
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
      });

      setPostToDelete(null);
      toast.success(t("feed.deleted"));
      await queryClient.invalidateQueries({ queryKey: ["feed", user.id] });
    } catch (error) {
      console.error("Failed to delete post:", error);
      toast.error(t("feed.deleteFailed"));
    } finally {
      setDeletingPost(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <PageHeader
        className="border-b border-border/70 pb-5"
        title={t("feed.title")}
        subtitle={t("feed.subtitle")}
        meta={
          <div className="w-fit rounded-full border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{posts.length}</span>{" "}
            {t("feed.posts")}
          </div>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 space-y-5" aria-label={t("feed.latest")}>
          <Card className="gap-0 overflow-hidden rounded-2xl py-0 shadow-none ring-border/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <UserAvatar
                  avatarUrl={profile?.avatar_url || user?.user_metadata?.avatar_url}
                  username={profile?.username}
                  email={user?.email}
                  equippedRewards={profile?.equipped_rewards}
                  className="size-10"
                />

                <button
                  type="button"
                  onClick={() => openComposer()}
                  className="flex h-11 min-w-0 flex-1 items-center rounded-full border border-border bg-muted/45 px-4 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
                >
                  <span className="truncate">{t("feed.whatsOnYourMind")}</span>
                </button>

                <Button
                  type="button"
                  onClick={() => openComposer()}
                  className="hidden rounded-full px-5 sm:inline-flex"
                >
                  <PenLine className="size-4" />
                  {t("feed.createPost")}
                </Button>
              </div>

              <div className="mt-4 flex items-center gap-1 border-t border-border/70 pt-3 sm:pl-12">
                <button
                  type="button"
                  onClick={() => openComposer(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Code2 className="size-4" />
                  {t("feed.addCode")}
                </button>
                <button
                  type="button"
                  onClick={() => openComposer()}
                  className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <ImagePlus className="size-4" />
                  {t("feed.addImage")}
                </button>
              </div>
            </CardContent>
          </Card>

          {suggested.length > 0 && (
            <Card className="rounded-2xl shadow-none ring-border/80 xl:hidden">
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <UsersRound className="size-4" />
                  <h2 className="text-sm font-semibold">{t("feed.suggestedUsers")}</h2>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {suggested.slice(0, 5).map((suggestion) => {
                    const username = suggestion.username || t("user.user");

                    return (
                      <div
                        key={suggestion.id}
                        className="flex min-w-[190px] items-center gap-2 rounded-xl border border-border p-2.5"
                      >
                        <button
                          type="button"
                          onClick={() => suggestion.username && router.push(`/u/${suggestion.username}`)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <UserAvatar
                            avatarUrl={suggestion.avatar_url}
                            username={username}
                            equippedRewards={suggestion.equipped_rewards}
                            className="size-8"
                          />
                          <span className="truncate text-sm font-medium">{username}</span>
                        </button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={following.has(suggestion.id) ? t("feed.unfollow") : t("feed.follow")}
                          onClick={() => followUser(suggestion.id)}
                          className="rounded-full"
                        >
                          <UsersRound className="size-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="font-semibold">{t("feed.latest")}</h2>
              <p className="text-xs text-muted-foreground">
                {t("feed.latestDescription")}
              </p>
            </div>
            <Sparkles className="size-4 text-muted-foreground" />
          </div>

          {loading &&
            Array.from({ length: 3 }).map((_, index) => (
              <FeedPostSkeleton key={index} />
            ))}

          {!loading && posts.length === 0 && (
            <Card className="rounded-2xl py-10 shadow-none ring-border/80">
              <EmptyState
                icon={<MessageCircle className="size-6" />}
                title={t("feed.noPosts")}
              />
            </Card>
          )}

          {!loading &&
            posts.map((post) => (
              <FeedPostCard
                key={post.id}
                commentCount={commentCounts[post.id] || 0}
                dateLocale={locale}
                isAdmin={isAdmin}
                isLiked={Boolean(liked[post.id])}
                labels={{
                  comment: t("feed.comment"),
                  deletePost: t("feed.deletePost"),
                  like: t("feed.like"),
                  share: t("feed.share"),
                }}
                likeCount={likes[post.id] || 0}
                onAuthorOpen={(username) => router.push(`/u/${username}`)}
                onCommentsOpen={(postId) => router.push(`/post/${postId}`)}
                onDelete={setPostToDelete}
                onShare={handleShare}
                onToggleLike={toggleLike}
                post={post}
              />
            ))}
        </section>

        <aside className="hidden space-y-4 xl:sticky xl:top-6 xl:block">
          <Card className="rounded-2xl shadow-none ring-border/80">
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <UsersRound className="size-4" />
                </span>
                <div>
                  <h2 className="font-semibold">{t("feed.suggestedUsers")}</h2>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("feed.suggestedSubtitle")}
                  </p>
                </div>
              </div>

              {suggested.length === 0 && (
                <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                  {t("feed.noSuggestions")}
                </p>
              )}

              <div className="space-y-1">
                {suggested.slice(0, 5).map((suggestion) => {
                  const username = suggestion.username || t("user.user");

                  return (
                    <div
                      key={suggestion.id}
                      className="flex items-center gap-2 rounded-xl p-2 transition-colors hover:bg-accent/70"
                    >
                      <button
                        type="button"
                        onClick={() => suggestion.username && router.push(`/u/${suggestion.username}`)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                      >
                        <UserAvatar
                          avatarUrl={suggestion.avatar_url}
                          username={username}
                          equippedRewards={suggestion.equipped_rewards}
                          className="size-9"
                        />
                        <span className="truncate text-sm font-medium">{username}</span>
                      </button>

                      <Button
                        size="sm"
                        variant={following.has(suggestion.id) ? "secondary" : "outline"}
                        onClick={() => followUser(suggestion.id)}
                        className="h-7 rounded-full px-2.5 text-xs"
                      >
                        {following.has(suggestion.id) ? t("feed.unfollow") : t("feed.follow")}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl bg-muted/35 shadow-none ring-border/70">
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="size-4" />
                  {t("feed.communityActivity")}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {t("feed.communityDescription")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border bg-background/70 p-3">
                  <p className="text-xl font-semibold">{posts.length}</p>
                  <p className="text-xs text-muted-foreground">{t("feed.posts")}</p>
                </div>
                <div className="rounded-xl border border-border bg-background/70 p-3">
                  <p className="text-xl font-semibold">{codeShareCount}</p>
                  <p className="text-xs text-muted-foreground">{t("feed.codeShares")}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-xl">
          <div className="space-y-4 p-5">
            <div>
              <DialogTitle>{t("feed.createPost")}</DialogTitle>
              <DialogDescription className="mt-1">
                {t("feed.composerDescription")}
              </DialogDescription>
            </div>

            <div className="flex items-center gap-3">
              <UserAvatar
                avatarUrl={profile?.avatar_url || user?.user_metadata?.avatar_url}
                username={profile?.username}
                email={user?.email}
                equippedRewards={profile?.equipped_rewards}
                className="size-10"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {profile?.username || t("user.user")}
                </p>
                <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>

            {user && (
              <MentionTextarea
                emptyLabel={t("feed.mentions.empty")}
                followedLabel={t("feed.mentions.following")}
                loadingLabel={t("feed.mentions.loading")}
                onChange={setContent}
                placeholder={t("feed.whatsOnYourMind")}
                searchLabel={t("feed.mentions.search")}
                userId={user.id}
                value={content}
              />
            )}

            <div className="flex items-center gap-1 rounded-xl border border-border p-1.5">
              <button
                type="button"
                onClick={() => setShowCode((current) => !current)}
                className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                  showCode ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/70"
                }`}
              >
                <Code2 className="size-4" />
                {showCode ? t("feed.removeCode") : t("feed.addCode")}
              </button>
              <button
                type="button"
                onClick={() => document.getElementById("feed-image-upload")?.click()}
                className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/70"
              >
                <ImagePlus className="size-4" />
                {t("feed.addImage")}
              </button>
            </div>

            {showCode && (
              <Textarea
                placeholder={t("feed.pasteCode")}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                className="min-h-[140px] font-mono"
              />
            )}

            <div
              className="cursor-pointer rounded-xl border border-dashed border-border p-5 text-center transition-colors hover:bg-muted/50"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const file = event.dataTransfer.files?.[0];
                if (file) setImage(file);
              }}
              onClick={() => document.getElementById("feed-image-upload")?.click()}
            >
              <ImagePlus className="mx-auto size-5 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">{t("feed.dragDrop")}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("feed.orClick")}</p>
              {image && (
                <p className="mt-3 truncate rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  {t("feed.selected")}: {image.name}
                </p>
              )}
              <input
                id="feed-image-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => setImage(event.target.files?.[0] || null)}
              />
            </div>

            <Button
              onClick={createPost}
              disabled={posting || !content.trim()}
              className="w-full rounded-xl"
            >
              {posting ? t("feed.posting") : t("feed.post")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

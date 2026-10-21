"use client";

import { useId } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api, type FeedData, type FeedPost } from "@/lib/api";
import { useLanguage } from "@/components/LanguageProvider";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function PostAiLabel({ marked }: { marked?: boolean }) {
  const { t } = useLanguage();
  if (marked !== true) return null;
  return <Badge variant="secondary" className="max-w-full whitespace-normal" data-ai-generated="true">{t("feed.ai.label")}</Badge>;
}

export function PostAiSwitch({ checked, onCheckedChange, disabled = false }: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  const { t } = useLanguage();
  return (
    <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
      <div className="min-w-0 space-y-1">
        <Label htmlFor={id} className="cursor-pointer leading-5">{t("feed.ai.switchLabel")}</Label>
        <p id={`${id}-description`} className="text-xs leading-5 text-muted-foreground">{t("feed.ai.description")}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} aria-describedby={`${id}-description`} className="mt-0.5" />
    </div>
  );
}

export function PostAiEditor({ post }: { post: FeedPost }) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (checked: boolean) => api.feed.setAiGenerated(post.id, checked),
    onMutate: async () => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: ["post", post.id, "detail"] }),
        queryClient.cancelQueries({ queryKey: ["feed"] }),
      ]);
    },
    onSuccess: (checked) => {
      queryClient.setQueryData<FeedPost | null>(["post", post.id, "detail"], current => current ? { ...current, is_ai_generated: checked } : current);
      queryClient.setQueriesData<FeedData>({ queryKey: ["feed"] }, current => current ? {
        ...current,
        posts: current.posts.map(item => item.id === post.id ? { ...item, is_ai_generated: checked } : item),
      } : current);
      toast.success(t("feed.ai.saved"));
    },
    onError: () => toast.error(t("feed.ai.saveError")),
  });
  return <PostAiSwitch checked={post.is_ai_generated === true} disabled={mutation.isPending} onCheckedChange={checked => mutation.mutate(checked)} />;
}

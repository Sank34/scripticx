import { ProfileBackground } from "@/components/user/ProfileBackground";
import { UserAvatar } from "@/components/user/UserAvatar";
import {
  rewardProductToSnapshot,
  type EquippedRewards,
  type RewardProduct,
} from "@/lib/rewards";
import { cn } from "@/lib/utils";

export function RewardProductPreview({
  avatarUrl,
  className,
  compact = false,
  equipped,
  locale = "en",
  product,
  username,
}: {
  avatarUrl?: string | null;
  className?: string;
  compact?: boolean;
  equipped?: EquippedRewards;
  locale?: "en" | "ro";
  product: RewardProduct;
  username?: string | null;
}) {
  const previewRewards: EquippedRewards = {
    ...equipped,
    [product.category]: rewardProductToSnapshot(product),
  };

  if (product.category === "profile-background") {
    return (
      <div
        className={cn(
          "relative h-full w-full overflow-hidden rounded-xl border bg-zinc-50",
          className
        )}
      >
        <ProfileBackground product={product} preview />
        <div
          className={cn(
            "absolute flex items-center border bg-white/90 shadow-sm",
            compact
              ? "inset-x-1.5 bottom-1.5 gap-1.5 rounded-md px-1.5 py-1"
              : "inset-x-3 bottom-3 gap-2.5 rounded-lg p-2.5"
          )}
        >
          <UserAvatar
            avatarUrl={avatarUrl}
            username={username}
            className={compact ? "size-5" : "size-9"}
          />
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                "rounded bg-zinc-700/80",
                compact ? "h-1.5 w-7 max-w-full" : "h-2 w-16 max-w-full"
              )}
            />
            <div
              className={cn(
                "rounded bg-zinc-300",
                compact ? "mt-1 h-1 w-4 max-w-full" : "mt-1.5 h-1.5 w-10 max-w-full"
              )}
            />
          </div>
        </div>
      </div>
    );
  }

  if (product.category === "profile-title") {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center rounded-xl bg-zinc-100",
          compact ? "gap-1" : "gap-3",
          className
        )}
      >
        <UserAvatar
          avatarUrl={avatarUrl}
          username={username}
          equippedRewards={equipped}
          className={cn(
            "border-2 border-white shadow-sm",
            compact ? "size-7" : "size-14"
          )}
        />
        <div
          className={cn(
            "max-w-[85%] truncate rounded-full border bg-white font-medium",
            compact ? "px-1.5 py-0.5 text-[8px] leading-none" : "px-3 py-1 text-xs"
          )}
        >
          {product.name[locale]}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-xl bg-zinc-100",
        className
      )}
    >
      <UserAvatar
        avatarUrl={avatarUrl}
        username={username}
        equippedRewards={previewRewards}
        className={cn(
          "border-2 border-white shadow-sm",
          compact ? "size-12" : "size-20"
        )}
      />
    </div>
  );
}

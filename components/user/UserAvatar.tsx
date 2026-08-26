import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Leaf } from "lucide-react";

import { resolveAvatarUrl } from "@/lib/avatar";
import {
  resolveEquippedReward,
  type EquippedRewardSnapshot,
  type EquippedRewards,
} from "@/lib/rewards";
import { cn } from "@/lib/utils";

type UserAvatarProps = {
  avatarUrl?: string | null;
  className?: string;
  email?: string | null;
  equippedRewards?: EquippedRewards | null;
  username?: string | null;
};

function CustomAvatarAsset({
  reward,
  className,
}: {
  className: string;
  reward: EquippedRewardSnapshot;
}) {
  if (!reward.assetUrl) return null;

  const scale = Math.min(220, Math.max(70, reward.styleConfig?.assetScale ?? 145));
  const offsetX = Math.min(50, Math.max(-50, reward.styleConfig?.assetOffsetX ?? 0));
  const offsetY = Math.min(50, Math.max(-50, reward.styleConfig?.assetOffsetY ?? 0));

  return (
    // Admin-managed cosmetic assets are rendered as non-interactive overlays.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      aria-hidden
      alt=""
      src={reward.assetUrl}
      className={cn(
        "pointer-events-none absolute max-w-none select-none object-contain",
        className
      )}
      style={{
        height: `${scale}%`,
        left: `${50 + offsetX}%`,
        top: `${50 + offsetY}%`,
        transform: "translate(-50%, -50%)",
        width: `${scale}%`,
      }}
    />
  );
}

export function UserAvatar({
  avatarUrl,
  className,
  email,
  equippedRewards,
  username,
}: UserAvatarProps) {
  const initial = (username || email || "U")[0]?.toUpperCase() || "U";
  const imageUrl = resolveAvatarUrl(avatarUrl);
  const frame = resolveEquippedReward(equippedRewards?.["avatar-frame"]);
  const decoration = resolveEquippedReward(
    equippedRewards?.["avatar-decoration"]
  );

  return (
    <span className={cn("relative inline-flex size-8 shrink-0 overflow-visible rounded-full", className)}>
      {frame?.id === "orbit-frame" && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-1 rounded-full border-2 border-indigo-500 ring-2 ring-indigo-500/10"
        >
          <span className="absolute -right-0.5 top-0 size-2 rounded-full border border-white bg-indigo-500" />
        </span>
      )}

      <Avatar className="size-full border-inherit shadow-inherit">
        <AvatarImage src={imageUrl} alt="" />
        <AvatarFallback>{initial}</AvatarFallback>
      </Avatar>

      {frame?.visual === "custom-overlay" && (
        <CustomAvatarAsset reward={frame} className="z-10" />
      )}

      {decoration?.id === "laurel-decoration" && (
        <span aria-hidden className="pointer-events-none absolute -inset-x-2 -bottom-1 flex items-end justify-between text-emerald-600">
          <Leaf className="size-[48%] -rotate-[35deg] fill-emerald-100" />
          <Leaf className="size-[48%] rotate-[215deg] fill-emerald-100" />
        </span>
      )}

      {decoration?.id === "pixel-crown" && (
        <Crown
          aria-hidden
          className="pointer-events-none absolute -top-[38%] left-1/2 z-10 size-[62%] -translate-x-1/2 -rotate-6 fill-amber-300 text-amber-600 drop-shadow-sm"
        />
      )}

      {decoration?.visual === "custom-overlay" && (
        <CustomAvatarAsset reward={decoration} className="z-20" />
      )}
    </span>
  );
}

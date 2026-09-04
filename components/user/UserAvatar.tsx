import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Leaf } from "lucide-react";

import { DEFAULT_AVATAR_URL, resolveAvatarUrl } from "@/lib/avatar";
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

function BirthdayPartyDecoration() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className="pointer-events-none absolute -inset-[28%] z-20 size-[156%] overflow-visible drop-shadow-sm"
    >
      <path
        d="M36 31 49 4 65 32Z"
        className="fill-pink-300 stroke-pink-700"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="m42 19 18 5" className="stroke-amber-200" strokeWidth="4" />
      <path d="m46 11 13 4" className="stroke-violet-300" strokeWidth="3.5" />
      <circle cx="49" cy="4" r="4.5" className="fill-sky-300 stroke-sky-700" strokeWidth="1.8" />
      <path
        d="M70 72 91 62 82 83Z"
        className="fill-amber-300 stroke-amber-700"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="m78 68 7 9" className="stroke-pink-500" strokeWidth="3" />
      <path d="M88 58c7-8 4-14 10-17M91 65c7-1 8 4 12 2M87 54c-1-6-6-6-6-11"
        className="fill-none stroke-emerald-500"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      <circle cx="96" cy="47" r="2" className="fill-violet-400" />
      <circle cx="99" cy="61" r="1.8" className="fill-pink-400" />
      <path d="m84 45 3-4M93 78l4 4" className="stroke-sky-500" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function UserAvatar({
  avatarUrl,
  className,
  equippedRewards,
}: UserAvatarProps) {
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
        <AvatarImage src={imageUrl} alt="" referrerPolicy="no-referrer" />
        <AvatarFallback>
          <Image
            src={DEFAULT_AVATAR_URL}
            alt=""
            width={64}
            height={64}
            className="size-full rounded-full object-cover"
          />
        </AvatarFallback>
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

      {(decoration?.id === "birthday-party-decoration" ||
        decoration?.visual === "birthday-party") && (
        <BirthdayPartyDecoration />
      )}

      {decoration?.visual === "custom-overlay" && (
        <CustomAvatarAsset reward={decoration} className="z-20" />
      )}
    </span>
  );
}

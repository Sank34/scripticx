"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import { X } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProfileImagePreviewProps = {
  alt: string;
  avatarUrl?: string | null;
  className?: string;
  fallback: string;
};

export function ProfileImagePreview({
  alt,
  avatarUrl,
  className,
  fallback,
}: ProfileImagePreviewProps) {
  const avatar = (
    <Avatar className={className}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={alt} /> : null}
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );

  if (!avatarUrl) {
    return avatar;
  }

  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className={cn(
            "rounded-full outline-none transition hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className
          )}
          aria-label={`Open ${alt}`}
        >
          {avatar}
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 flex w-[min(88vw,520px)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
          <DialogPrimitive.Title className="sr-only">{alt}</DialogPrimitive.Title>
          <div className="relative aspect-square w-full overflow-hidden rounded-full border border-white/20 bg-white/10 shadow-2xl">
            <img
              src={avatarUrl}
              alt={alt}
              className="h-full w-full object-cover"
            />
          </div>
          <DialogPrimitive.Close asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute -right-2 -top-12 rounded-full bg-white/15 text-white hover:bg-white/25"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

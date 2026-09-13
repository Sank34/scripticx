"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CakeSlice, Gift, Music2, PartyPopper, Volume2 } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { RewardProductPreview } from "@/components/rewards/RewardProductPreview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileBackground } from "@/components/user/ProfileBackground";
import type { ProfileSummary } from "@/lib/api";
import { fetchRewardProductsByIds } from "@/lib/rewardsData";

const noteFrequencies: Record<string, number> = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392,
  A4: 440,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
};

const birthdayMelody: Array<[keyof typeof noteFrequencies, number]> = [
  ["G4", 0.24], ["G4", 0.14], ["A4", 0.38], ["G4", 0.38], ["C5", 0.38], ["B4", 0.72],
  ["G4", 0.24], ["G4", 0.14], ["A4", 0.38], ["G4", 0.38], ["D5", 0.38], ["C5", 0.72],
  ["G4", 0.24], ["G4", 0.14], ["G5", 0.38], ["E5", 0.38], ["C5", 0.38], ["B4", 0.38], ["A4", 0.72],
  ["F5", 0.24], ["F5", 0.14], ["E5", 0.38], ["C5", 0.38], ["D5", 0.38], ["C5", 0.8],
];

type BrowserAudioWindow = typeof window & {
  webkitAudioContext?: typeof AudioContext;
};

export function BirthdayCelebration({
  onDismiss,
  profile,
  productIds,
}: {
  onDismiss: () => void;
  profile: ProfileSummary | null;
  productIds: string[];
}) {
  const router = useRouter();
  const { locale } = useLanguage();
  const audioContextRef = useRef<AudioContext | null>(null);
  const [songPlayed, setSongPlayed] = useState(false);
  const language = locale === "ro" ? "ro" : "en";
  const username = profile?.username || (language === "ro" ? "creatorule" : "creator");
  const productsQuery = useQuery({
    queryKey: ["rewards-shop", "birthday-products", productIds],
    queryFn: () => fetchRewardProductsByIds(productIds),
    enabled: productIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });
  const birthdayProducts = productsQuery.data || [];
  const birthdayBackground = birthdayProducts.find(
    (product) => product.category === "profile-background"
  );
  const copy = language === "ro"
    ? {
        badge: "Astăzi e despre tine",
        title: `La mulți ani, ${username}!`,
        description: "Echipa ScripticX și mascotele ți-au pregătit o mică petrecere.",
        giftsTitle: "Două cadouri noi te așteaptă",
        giftsDescription: "Le găsești în Inventory și le poți echipa oricând.",
        new: "Nou",
        playSong: "Pornește cântecul",
        replaySong: "Ascultă din nou",
        openInventory: "Deschide cadourile",
        giftsUnavailable: "Detaliile cadourilor nu au putut fi încărcate.",
      }
    : {
        badge: "Today is all about you",
        title: `Happy birthday, ${username}!`,
        description: "The ScripticX team and mascots prepared a little party for you.",
        giftsTitle: "Two new gifts are waiting",
        giftsDescription: "Find them in your Inventory and equip them whenever you like.",
        new: "New",
        playSong: "Play birthday song",
        replaySong: "Play it again",
        openInventory: "Open my gifts",
        giftsUnavailable: "Gift details could not be loaded.",
      };

  const playBirthdaySong = useCallback(async () => {
    const AudioContextClass =
      window.AudioContext || (window as BrowserAudioWindow).webkitAudioContext;
    if (!AudioContextClass) return false;

    try {
      if (audioContextRef.current) {
        await audioContextRef.current.close().catch(() => undefined);
      }

      const context = new AudioContextClass();
      audioContextRef.current = context;
      await context.resume();
      if (context.state !== "running") return false;

      const masterGain = context.createGain();
      masterGain.gain.setValueAtTime(0.075, context.currentTime);
      masterGain.connect(context.destination);

      const sparkle = context.createOscillator();
      const sparkleGain = context.createGain();
      sparkle.type = "sine";
      sparkle.frequency.setValueAtTime(880, context.currentTime);
      sparkle.frequency.exponentialRampToValueAtTime(1760, context.currentTime + 0.18);
      sparkleGain.gain.setValueAtTime(0.0001, context.currentTime);
      sparkleGain.gain.exponentialRampToValueAtTime(0.45, context.currentTime + 0.025);
      sparkleGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24);
      sparkle.connect(sparkleGain);
      sparkleGain.connect(masterGain);
      sparkle.start();
      sparkle.stop(context.currentTime + 0.25);

      let cursor = context.currentTime + 0.34;
      birthdayMelody.forEach(([note, duration], index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const startsAt = cursor;
        const endsAt = startsAt + duration;

        oscillator.type = index % 2 === 0 ? "triangle" : "sine";
        oscillator.frequency.setValueAtTime(noteFrequencies[note], startsAt);
        gain.gain.setValueAtTime(0.0001, startsAt);
        gain.gain.exponentialRampToValueAtTime(0.6, startsAt + 0.025);
        gain.gain.setValueAtTime(0.5, Math.max(startsAt + 0.03, endsAt - 0.07));
        gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);
        oscillator.connect(gain);
        gain.connect(masterGain);
        oscillator.start(startsAt);
        oscillator.stop(endsAt + 0.01);
        cursor = endsAt + 0.055;
      });

      window.setTimeout(() => {
        if (audioContextRef.current === context) audioContextRef.current = null;
        void context.close();
      }, Math.ceil((cursor - context.currentTime + 0.2) * 1000));
      setSongPlayed(true);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timers: number[] = [];

    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return;
      const shared = {
        colors: ["#f9a8d4", "#93c5fd", "#fde68a", "#a7f3d0", "#c4b5fd"],
        disableForReducedMotion: true,
        zIndex: 180,
      };

      void confetti({
        ...shared,
        particleCount: 90,
        spread: 92,
        startVelocity: 42,
        origin: { x: 0.5, y: 0.18 },
      });
      timers.push(window.setTimeout(() => {
        void confetti({ ...shared, particleCount: 45, angle: 58, spread: 58, origin: { x: 0.02, y: 0.62 } });
        void confetti({ ...shared, particleCount: 45, angle: 122, spread: 58, origin: { x: 0.98, y: 0.62 } });
      }, 360));
      timers.push(window.setTimeout(() => {
        void confetti({ ...shared, particleCount: 55, spread: 120, scalar: 0.8, origin: { x: 0.5, y: 0.42 } });
      }, 820));
    });

    void playBirthdaySong();

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [playBirthdaySong]);

  function openInventory() {
    onDismiss();
    router.push("/shop?birthday=1");
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-2xl" showCloseButton>
        <section className="relative isolate min-h-64 overflow-hidden border-b bg-muted/40 px-5 py-8 text-center sm:px-10">
          {birthdayBackground ? <ProfileBackground product={birthdayBackground} preview /> : null}

          <Image
            aria-hidden
            src="/mascota-robotel.png"
            alt=""
            width={180}
            height={160}
            className="absolute -bottom-4 -left-8 z-10 w-32 -rotate-6 object-contain motion-safe:animate-bounce sm:left-0 sm:w-40"
          />
          <Image
            aria-hidden
            src="/mascota-soricel.png"
            alt=""
            width={104}
            height={176}
            className="absolute -bottom-5 -right-1 z-10 w-20 rotate-6 object-contain motion-safe:animate-bounce sm:right-5 sm:w-24"
          />

          <div className="relative z-20 mx-auto max-w-sm">
            <Badge variant="outline" className="bg-background/90 px-3 py-1">
              <PartyPopper className="size-3.5" />
              {copy.badge}
            </Badge>
            <div className="mx-auto mt-6 flex size-16 items-center justify-center rounded-2xl border bg-background shadow-sm">
              <CakeSlice className="size-7" />
            </div>
            <DialogHeader className="mt-5 items-center">
              <DialogTitle className="text-2xl font-semibold sm:text-3xl">
                {copy.title}
              </DialogTitle>
              <DialogDescription className="max-w-sm text-sm leading-6 sm:text-base">
                {copy.description}
              </DialogDescription>
            </DialogHeader>
          </div>
        </section>

        <section className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
              <Gift className="size-5" />
            </span>
            <div>
              <h2 className="font-semibold">{copy.giftsTitle}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">{copy.giftsDescription}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {productsQuery.isPending
              ? productIds.map((productId) => (
                  <Skeleton key={productId} className="h-36 rounded-[var(--sx-radius-card)]" />
                ))
              : birthdayProducts.map((product) => (
              <div key={product.id} className="overflow-hidden rounded-[var(--sx-radius-card)] border bg-card p-2.5">
                <div className="relative h-24">
                  <RewardProductPreview
                    product={product}
                    locale={language}
                    avatarUrl={profile?.avatar_url}
                    username={profile?.username}
                    compact
                  />
                  <Badge className="absolute right-2 top-2 bg-background text-foreground shadow-sm" variant="outline">
                    {copy.new}
                  </Badge>
                </div>
                <p className="mt-2.5 truncate px-1 text-sm font-medium">{product.name[language]}</p>
                <p className="mt-0.5 line-clamp-1 px-1 text-xs text-muted-foreground">
                  {product.description[language]}
                </p>
              </div>
                ))}
          </div>
          {productsQuery.isError ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {copy.giftsUnavailable}
            </p>
          ) : null}

          <div className="mt-5 flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={() => void playBirthdaySong()}>
              {songPlayed ? <Music2 className="size-4" /> : <Volume2 className="size-4" />}
              {songPlayed ? copy.replaySong : copy.playSong}
            </Button>
            <Button size="lg" onClick={openInventory}>
              <Gift className="size-4" />
              {copy.openInventory}
            </Button>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}

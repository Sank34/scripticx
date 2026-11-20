"use client";

import Image from "next/image";
import { useId } from "react";
import { Megaphone } from "lucide-react";

import { useLanguage } from "@/components/LanguageProvider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ScheduledAnnouncement } from "@/lib/scheduled-announcements";

type AnnouncementContent = Pick<ScheduledAnnouncement, "title" | "body" | "images" | "buttons" | "show_mascots">;

export function AnnouncementDialog({ announcement, pending = false, preview = false, onAcknowledge }: {
  announcement: AnnouncementContent;
  pending?: boolean;
  preview?: boolean;
  onAcknowledge: (href?: string) => void;
}) {
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const acknowledgmentId = useId();

  return (
    <Dialog open onOpenChange={(open) => { if (!open && preview) onAcknowledge(); }}>
      <DialogContent
        showCloseButton={preview}
        onEscapeKeyDown={(event) => { if (!preview) event.preventDefault(); }}
        onInteractOutside={(event) => { if (!preview) event.preventDefault(); }}
        className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-2xl"
      >
        <DialogHeader className="relative isolate overflow-hidden border-b bg-muted/50 px-6 py-8 text-center sm:px-12">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl border bg-background">
            <Megaphone className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle className="mx-auto mt-2 max-w-lg text-2xl wrap-anywhere sm:text-3xl">{announcement.title}</DialogTitle>
          <DialogDescription className="sr-only">{ro ? "Anunț ScripticX" : "ScripticX announcement"}</DialogDescription>
          {announcement.show_mascots && (
            <div className="mx-auto mt-3 flex items-end justify-center gap-5" aria-hidden="true">
              <Image src="/mascota-robotel.png" alt="" width={94} height={84} className="h-16 w-auto object-contain" />
              <Image src="/mascota-soricel.png" alt="" width={52} height={88} className="h-20 w-auto object-contain" />
            </div>
          )}
        </DialogHeader>
        <div className="space-y-5 p-5 sm:p-7">
          <p className="text-sm leading-relaxed whitespace-pre-wrap wrap-anywhere">{announcement.body}</p>
          {announcement.images.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {announcement.images.map((image, index) => (
                <div key={index} className={announcement.images.length === 1 ? "sm:col-span-2" : undefined}>
                  {/* Custom announcements may use uploaded images or external HTTPS URLs. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.src.trim()} alt={image.alt} referrerPolicy="no-referrer" className="aspect-video w-full rounded-lg border bg-muted object-contain" />
                </div>
              ))}
            </div>
          )}
          <div className="space-y-3 border-t pt-4">
            {announcement.buttons.length > 0 ? (
              <>
                <label htmlFor={acknowledgmentId} className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                  <Checkbox id={acknowledgmentId} checked={pending} disabled={pending || preview}
                    onCheckedChange={(checked) => { if (checked) onAcknowledge(); }} />
                  {ro ? "Am citit anunțul" : "I’ve read this announcement"}
                </label>
                <div className="flex flex-wrap justify-end gap-2">
                  {announcement.buttons.map((button, index) => (
                    <Button key={index} className="min-h-10 max-w-full whitespace-normal" variant={index === 0 ? "default" : "outline"} disabled={pending || preview} onClick={() => onAcknowledge(button.href)}>
                      {button.label}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex justify-end">
                <Button className="min-h-10" disabled={pending} onClick={() => onAcknowledge()}>
                  {preview ? (ro ? "Închide previzualizarea" : "Close preview") : (ro ? "Am înțeles" : "Got it")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

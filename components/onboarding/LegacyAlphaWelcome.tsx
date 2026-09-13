"use client";

import Image from "next/image";
import { ArrowRight, Gift, LoaderCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function LegacyAlphaWelcome({ onStart, starting }: { onStart: () => void; starting: boolean }) {
  const { locale } = useLanguage();
  const ro = locale === "ro";
  return (
    <Dialog open>
      <DialogContent showCloseButton={false} onEscapeKeyDown={event => event.preventDefault()}
        onInteractOutside={event => event.preventDefault()}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-6 sm:max-w-lg sm:p-8 motion-reduce:animate-none">
        <div className="mb-2 flex justify-center">
          <Image src="/logo-text.svg" width={203} height={41} alt="ScripticX" className="h-auto w-44 max-w-full object-contain dark:invert" />
        </div>
        <DialogHeader className="gap-3">
          <DialogTitle className="text-2xl leading-tight tracking-tight sm:text-3xl">
            {ro ? "Mulțumim că ai fost printre primii." : "Thanks for being one of the first."}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {ro ? "Lansăm versiunea oficială ScripticX! Îți mulțumim că ai testat V1 Alpha și ai fost alături de noi de la început."
              : "We’re launching the official version of ScripticX! Thank you for testing V1 Alpha and being here from the beginning."}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">{ro
          ? "Este posibil să mai întâlnești buguri. Le poți raporta oricând din pagina Contact, iar în What’s New poți descoperi toate funcționalitățile noi."
          : "You may still encounter some bugs. You can report them anytime on the Contact page and explore all the new features in What’s New."}</p>
        <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
          <p className="text-sm font-medium">{ro ? "Acum, hai să-l configurăm pentru tine." : "Now, let’s make it yours."}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{ro
            ? "Contul tău a fost creat înainte să existe onboarding-ul. Pentru a continua, alege limba, interesele și modul în care vrei să folosești platforma. După configurare, îți arătăm și ce găsești în workspace-ul tău."
            : "Your account was created before onboarding was available. To continue, choose your language, interests and how you want to use the platform. After setup, we’ll show you around your workspace."}</p>
        </div>
        <div className="flex items-start gap-3 rounded-xl border p-4">
          <Gift className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium">{ro ? "Un cadou pentru tine" : "A gift for you"}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">{ro
              ? "Fundalul MiniScript+ este acum în inventarul tău, gratuit. Îl poți activa după configurare, când dorești."
              : "MiniScript+ Background is now in your inventory, free of charge. You can equip it after setup, whenever you like."}</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{ro ? "Progresul, punctele și munca ta rămân în cont." : "Your progress, points and work stay in your account."}</p>
        <Button onClick={onStart} disabled={starting} className="mt-1 w-full gap-2">
          {starting ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {starting ? (ro ? "Se pregătește…" : "Getting ready…") : (ro ? "Începe configurarea" : "Start onboarding")}
          {!starting && <ArrowRight className="size-4" />}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

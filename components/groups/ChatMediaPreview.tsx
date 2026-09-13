"use client";

import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useLanguage } from "@/components/LanguageProvider";

export function ChatMediaPreview({ url, name }: { url: string; name: string }) {
  const { locale } = useLanguage();
  return <Dialog>
    <DialogTrigger asChild>
      <button type="button" aria-label={`${locale === "ro" ? "Previzualizează" : "Preview"}: ${name}`} className="block max-w-full overflow-hidden rounded-2xl border border-border bg-background p-0 transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <img src={url} alt={name} className="max-h-80 w-[min(65vw,24rem)] object-contain" />
      </button>
    </DialogTrigger>
    <DialogContent aria-describedby={undefined} className="w-[calc(100%-2rem)] max-w-5xl gap-3 p-3 duration-200 sm:max-w-5xl max-sm:duration-200 max-sm:data-open:animate-in max-sm:data-closed:animate-out motion-reduce:data-open:animate-none motion-reduce:data-closed:animate-none">
      <DialogTitle className="truncate pr-10 text-sm font-medium">{name}</DialogTitle>
      <img src={url} alt={name} className="max-h-[80dvh] w-full rounded-lg object-contain" />
    </DialogContent>
  </Dialog>;
}

"use client";

import { ArrowRight, LoaderCircle, X } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/UserAvatar";
import type { RecentAccount } from "@/lib/recent-accounts";

export function RecentAccounts({ accounts, sessionIds, selectedEmail, disabled, continuingId, removingId, onSelect, onContinue, onForget }: {
  accounts: RecentAccount[];
  sessionIds: Set<string>;
  selectedEmail: string;
  disabled: boolean;
  continuingId: string | null;
  removingId: string | null;
  onSelect: (account: RecentAccount) => void;
  onContinue: (account: RecentAccount) => void;
  onForget: (account: RecentAccount) => void;
}) {
  const { locale } = useLanguage();
  const ro = locale === "ro";
  if (!accounts.length) return null;
  return (
    <section aria-label={ro ? "Conturi recente" : "Recent accounts"} className="space-y-2">
      <div>
        <p className="text-sm font-medium">{ro ? "Conturi recente" : "Recent accounts"}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{ro ? "Selectează un cont pentru a completa emailul. Lista este păstrată pe acest dispozitiv." : "Select an account to fill in your email. This list is saved on this device."}</p>
      </div>
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border p-1">
        {accounts.map((account, index) => (
          <div key={account.userId} className="flex min-w-0 items-center gap-1 rounded-lg">
            <Button type="button" variant="ghost" disabled={disabled} aria-pressed={account.email.toLowerCase() === selectedEmail.trim().toLowerCase()} onClick={() => onSelect(account)} className="h-auto min-h-14 min-w-0 flex-1 justify-start gap-3 px-2 py-2 text-left aria-pressed:bg-muted">
              <UserAvatar avatarUrl={account.avatarUrl} username={account.username} email={account.email} className="size-9 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <span className="truncate text-sm font-medium">{account.nickname}</span>
                  {index === 0 && <span className="text-xs font-normal text-muted-foreground">{ro ? "Ultimul folosit" : "Last used"}</span>}
                </span>
                <span className="block truncate text-xs font-normal text-muted-foreground">{account.email}</span>
              </span>
            </Button>
            {sessionIds.has(account.userId) && <Button type="button" size="icon-lg" variant="ghost" disabled={disabled} onClick={() => onContinue(account)} title={ro ? "Continuă sesiunea" : "Continue session"} aria-label={`${ro ? "Continuă sesiunea pentru" : "Continue session for"} ${account.email}`}>
              {continuingId === account.userId ? <LoaderCircle className="animate-spin" /> : <ArrowRight />}
            </Button>}
            <Button type="button" size="icon-lg" variant="ghost" disabled={disabled} onClick={() => onForget(account)} title={ro ? "Elimină de pe dispozitiv" : "Forget on this device"} aria-label={`${ro ? "Elimină contul recent" : "Forget recent account"}: ${account.email}`}>
              {removingId === account.userId ? <LoaderCircle className="animate-spin" /> : <X />}
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { listSavedAccounts } from "@/lib/account-switcher";
import { listRecentAccounts, RECENT_ACCOUNTS_EVENT, seedRecentAccounts, type RecentAccount } from "@/lib/recent-accounts";

export function useRecentAccounts() {
  const [accounts, setAccounts] = useState<RecentAccount[]>([]);
  useEffect(() => {
    seedRecentAccounts(listSavedAccounts());
    const refresh = () => setAccounts(listRecentAccounts());
    refresh();
    window.addEventListener(RECENT_ACCOUNTS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(RECENT_ACCOUNTS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return accounts;
}

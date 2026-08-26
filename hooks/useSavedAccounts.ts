"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ACCOUNT_STORAGE_EVENT,
  listSavedAccounts,
  type SavedScripticXAccount,
} from "@/lib/account-switcher";

export function useSavedAccounts() {
  const [accounts, setAccounts] = useState<SavedScripticXAccount[]>([]);

  const refresh = useCallback(() => {
    setAccounts(listSavedAccounts());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(ACCOUNT_STORAGE_EVENT, refresh);
    window.addEventListener("storage", refresh);

    return () => {
      window.removeEventListener(ACCOUNT_STORAGE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return { accounts, refresh };
}


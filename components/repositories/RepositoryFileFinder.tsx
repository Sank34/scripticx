"use client";

import { FileCode2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useLanguage } from "@/components/LanguageProvider";
import { Button } from "@/components/ui/button";
import { Command, CommandDialog, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { ProjectFile } from "@/lib/editor-project";
import { repositoryPathHref } from "@/lib/repositories";

export function RepositoryFileFinder({ repositoryId, files }: { repositoryId: string; files: ProjectFile[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const tokens = query.trim().toLowerCase().split(/\s+/);
  const matches = files.filter((file) => tokens.every((token) => file.path.toLowerCase().includes(token))).slice(0, 40);

  return (
    <>
      <Button variant="outline" className="min-h-10" onClick={() => { setQuery(""); setOpen(true); }}>
        <Search aria-hidden="true" />{t("repositories.findFile")}
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title={t("repositories.findFile")} description={t("repositories.findFileDescription")}>
        <Command shouldFilter={false}>
          <CommandInput value={query} onValueChange={setQuery} placeholder={t("repositories.findFileDescription")} />
          <CommandList>
            <CommandEmpty>{t("repositories.noFileMatches")}</CommandEmpty>
            {matches.map((file) => (
              <CommandItem key={file.id} value={file.path} onSelect={() => {
                setOpen(false);
                router.push(repositoryPathHref(repositoryId, file.path), { scroll: false });
              }}>
                <FileCode2 aria-hidden="true" className="shrink-0" />
                <span className="min-w-0 wrap-anywhere">{file.path}</span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}

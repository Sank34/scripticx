"use client";

import {
  ArrowLeft,
  ArrowRight,
  Code2,
  Copy,
  Gauge,
  List,
  Medal,
  RefreshCw,
  Search,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { isGameRoute } from "@/lib/game-routes";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { startShellRouteProgress } from "@/components/navigation/ShellRouteProgress";

export function GlobalContextMenu({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = useLanguage();
  const ro = locale === "ro";
  const copy = ro
    ? {
        back: "Înapoi",
        competitions: "Competiții",
        copied: "Link copiat",
        copyLink: "Copiază linkul paginii",
        dashboard: "Panou principal",
        editor: "Editor",
        forward: "Înainte",
        navigate: "Navighează",
        problems: "Probleme",
        refresh: "Reîncarcă pagina",
        search: "Caută pe platformă",
      }
    : {
        back: "Back",
        competitions: "Competitions",
        copied: "Page link copied",
        copyLink: "Copy page link",
        dashboard: "Dashboard",
        editor: "Editor",
        forward: "Forward",
        navigate: "Navigate",
        problems: "Problems",
        refresh: "Refresh page",
        search: "Search platform",
      };

  function navigate(href: string) {
    startShellRouteProgress();
    router.push(href);
  }

  function openSearch() {
    const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        bubbles: true,
        ctrlKey: !isMac,
        key: "k",
        metaKey: isMac,
      })
    );
  }

  async function copyPageLink() {
    await navigator.clipboard.writeText(window.location.href);
    toast.success(copy.copied);
  }

  // Do not mount the platform trigger or its portal in the fullscreen game.
  if (isGameRoute(pathname)) {
    return <div className="contents" onContextMenu={event => event.preventDefault()}>{children}</div>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild className="!select-auto">
        <div className="contents">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-60">
        <ContextMenuLabel>ScripticX</ContextMenuLabel>
        <ContextMenuSeparator />

        <ContextMenuItem onSelect={openSearch}>
          <Search />
          {copy.search}
          <ContextMenuShortcut>⌘/Ctrl K</ContextMenuShortcut>
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={() => router.back()}>
          <ArrowLeft />
          {copy.back}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => router.forward()}>
          <ArrowRight />
          {copy.forward}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => router.refresh()}>
          <RefreshCw />
          {copy.refresh}
        </ContextMenuItem>

        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Gauge />
            {copy.navigate}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem onSelect={() => navigate("/dashboard")}>
              <Gauge />
              {copy.dashboard}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => navigate("/editor")}>
              <Code2 />
              {copy.editor}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => navigate("/problems")}>
              <List />
              {copy.problems}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => navigate("/competitions")}>
              <Medal />
              {copy.competitions}
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={copyPageLink}>
          <Copy />
          {copy.copyLink}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

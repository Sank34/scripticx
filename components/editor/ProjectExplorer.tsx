"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileCode2,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  buildProjectTree,
  type ProjectDirectory,
  type ProjectFile,
  type ProjectTreeNode,
} from "@/lib/editor-project";
import { cn } from "@/lib/utils";

type ProjectExplorerProps = {
  activeFileId: string | null;
  directories: ProjectDirectory[];
  files: ProjectFile[];
  locale: string;
  onDeleteDirectory: (path: string) => void;
  onDeleteFile: (id: string) => void;
  onDownloadFile: (file: ProjectFile) => void;
  onNewDirectory: (parentPath?: string) => void;
  onNewFile: (parentPath?: string) => void;
  onOpenFile: (id: string) => void;
  onRenameDirectory: (path: string) => void;
  onRenameFile: (id: string) => void;
  onShareFile: (file: ProjectFile) => void;
};

function FileGlyph({ file }: { file: ProjectFile }) {
  const codeFile = !["text", "markdown"].includes(file.language);
  const Icon = codeFile ? FileCode2 : FileText;

  return <Icon size={14} className="shrink-0 text-muted-foreground" />;
}

export function ProjectExplorer({
  activeFileId,
  directories,
  files,
  locale,
  onDeleteDirectory,
  onDeleteFile,
  onDownloadFile,
  onNewDirectory,
  onNewFile,
  onOpenFile,
  onRenameDirectory,
  onRenameFile,
  onShareFile,
}: ProjectExplorerProps) {
  const tree = useMemo(() => buildProjectTree(files, directories), [directories, files]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());
  const isRo = locale === "ro";

  useEffect(() => {
    setExpandedPaths((current) => {
      const next = new Set(current);
      for (const file of files) {
        const parts = file.path.split("/").slice(0, -1);
        let path = "";
        for (const part of parts) {
          path = path ? `${path}/${part}` : part;
          next.add(path);
        }
      }
      return next;
    });
  }, [files]);

  function toggleDirectory(path: string) {
    setExpandedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }

  function copyPath(path: string) {
    void navigator.clipboard.writeText(path);
  }

  function renderNode(node: ProjectTreeNode, depth = 0): React.ReactNode {
    if (node.kind === "directory") {
      const expanded = expandedPaths.has(node.path);
      return (
        <div key={node.id}>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <button
                type="button"
                onClick={() => toggleDirectory(node.path)}
                className="group flex h-7 w-full items-center gap-1.5 pr-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
                style={{ paddingLeft: 8 + depth * 12 }}
              >
                {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                {expanded ? (
                  <FolderOpen size={14} className="shrink-0 text-muted-foreground" />
                ) : (
                  <Folder size={14} className="shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 truncate font-medium">{node.name}</span>
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-52">
              <ContextMenuLabel className="truncate">{node.path}</ContextMenuLabel>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => onNewFile(node.path)}>
                <FilePlus2 size={14} />
                {isRo ? "Fișier nou" : "New file"}
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => onNewDirectory(node.path)}>
                <FolderPlus size={14} />
                {isRo ? "Director nou" : "New folder"}
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => onRenameDirectory(node.path)}>
                <Pencil size={14} />
                {isRo ? "Redenumește" : "Rename"}
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => copyPath(node.path)}>
                <Copy size={14} />
                {isRo ? "Copiază calea" : "Copy path"}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem variant="destructive" onSelect={() => onDeleteDirectory(node.path)}>
                <Trash2 size={14} />
                {isRo ? "Șterge directorul" : "Delete folder"}
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
          {expanded && node.children.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    }

    const file = node.file;
    if (!file) return null;
    const active = file.id === activeFileId;

    return (
      <ContextMenu key={file.id}>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            onClick={() => onOpenFile(file.id)}
            onDoubleClick={() => onRenameFile(file.id)}
            className={cn(
              "group flex h-7 w-full items-center gap-1.5 pr-2 text-left text-xs transition-colors",
              active
                ? "bg-muted font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            )}
            style={{ paddingLeft: 23 + depth * 12 }}
          >
            <FileGlyph file={file} />
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            {file.language === "msp" && (
              <span className="text-[10px] font-medium text-muted-foreground">MSP</span>
            )}
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          <ContextMenuLabel className="truncate">{file.path}</ContextMenuLabel>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => onOpenFile(file.id)}>
            <FileCode2 size={14} />
            {isRo ? "Deschide" : "Open"}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onRenameFile(file.id)}>
            <Pencil size={14} />
            {isRo ? "Redenumește" : "Rename"}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onShareFile(file)}>
            <Share2 size={14} />
            {isRo ? "Distribuie fișierul" : "Share file"}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => onDownloadFile(file)}>
            <Download size={14} />
            {isRo ? "Descarcă" : "Download"}
          </ContextMenuItem>
          <ContextMenuItem onSelect={() => copyPath(file.path)}>
            <Copy size={14} />
            {isRo ? "Copiază calea" : "Copy path"}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            variant="destructive"
            disabled={files.length === 1}
            onSelect={() => onDeleteFile(file.id)}
          >
            <Trash2 size={14} />
            {isRo ? "Șterge" : "Delete"}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="text-xs font-semibold">{isRo ? "Explorer" : "Explorer"}</span>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onNewFile()}
                className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={isRo ? "Fișier nou" : "New file"}
              >
                <FilePlus2 size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{isRo ? "Fișier nou" : "New file"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onNewDirectory()}
                className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={isRo ? "Director nou" : "New folder"}
              >
                <FolderPlus size={14} />
              </button>
            </TooltipTrigger>
            <TooltipContent>{isRo ? "Director nou" : "New folder"}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-1">
        {tree.length ? (
          tree.map((node) => renderNode(node))
        ) : (
          <div className="px-3 py-5 text-xs leading-relaxed text-muted-foreground">
            {isRo ? "Proiectul nu conține încă fișiere." : "This project does not have any files yet."}
          </div>
        )}
      </div>
    </div>
  );
}

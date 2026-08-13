"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowLeft,
  Bold,
  Braces,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  Columns2,
  FileCode2,
  FileDown,
  FileImage,
  Download,
  Eye,
  FileText,
  GripVertical,
  Heading1,
  ImagePlus,
  Italic,
  List,
  ListChecks,
  Link2,
  LoaderCircle,
  Pilcrow,
  Quote,
  Redo2,
  Star,
  Undo2,
  Upload,
} from "lucide-react";
import type { Editor } from "@tiptap/core";
import {
  Group,
  Panel,
  Separator,
  useGroupRef,
  type Layout,
  type LayoutChangedMeta,
} from "react-resizable-panels";
import { toast } from "sonner";

import { useLanguage } from "@/components/LanguageProvider";
import { Markdown } from "@/components/Markdown";
import { NotionMarkdownSurface } from "@/components/workspaces/NotionMarkdownSurface";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useAuth } from "@/hooks/useAuth";
import { useUndoHistory } from "@/hooks/useUndoHistory";
import { saveWorkspaceImage } from "@/lib/workspace-assets";
import { buildNoteOutline, getVisualMarkdownSupport } from "@/lib/note-outline";
import {
  getNote,
  updateNote,
  type WorkspaceNote,
} from "@/lib/workspace-storage";
import { cn } from "@/lib/utils";

type EditorMode = "edit" | "preview" | "source" | "split";

type NoteHistorySnapshot = {
  content: string;
  favorite: boolean;
  icon: string;
  title: string;
};

type SlashCommand = {
  id: string;
  icon: typeof Pilcrow;
  label: { en: string; ro: string };
  hint: string;
  action?: "image-upload" | "image-url";
  value: string;
};

type FloatingToolbarState = {
  end: number;
  left: number;
  start: number;
  top: number;
};

type ExportFormat = "html" | "md" | "pdf" | "png";

const slashCommands: SlashCommand[] = [
  { id: "text", icon: Pilcrow, label: { en: "Text", ro: "Text" }, hint: "", value: "" },
  { id: "h1", icon: Heading1, label: { en: "Heading 1", ro: "Titlu 1" }, hint: "#", value: "# " },
  { id: "h2", icon: Heading1, label: { en: "Heading 2", ro: "Titlu 2" }, hint: "##", value: "## " },
  { id: "list", icon: List, label: { en: "Bullet list", ro: "Listă" }, hint: "-", value: "- " },
  { id: "todo", icon: ListChecks, label: { en: "To-do", ro: "Task" }, hint: "[]", value: "- [ ] " },
  { id: "quote", icon: Quote, label: { en: "Quote", ro: "Citat" }, hint: ">", value: "> " },
  { id: "code", icon: Code2, label: { en: "Code block", ro: "Bloc de cod" }, hint: "```", value: "```\n\n```" },
  {
    id: "image-url",
    icon: ImagePlus,
    label: { en: "Image from URL", ro: "Imagine din URL" },
    hint: "URL",
    action: "image-url",
    value: "",
  },
  {
    id: "image-upload",
    icon: Upload,
    label: { en: "Upload image", ro: "Încarcă imagine" },
    hint: "PNG · JPG · WebP · GIF",
    action: "image-upload",
    value: "",
  },
];

const SPLIT_LAYOUT_STORAGE_KEY = "scripticx:workspace-note-editor-layout:v1";

export function MarkdownNoteEditor({ noteId }: { noteId: string }) {
  const router = useRouter();
  const { locale } = useLanguage();
  const { user } = useAuth();
  const ro = locale === "ro";
  const splitGroupRef = useGroupRef();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorSurfaceRef = useRef<HTMLDivElement | null>(null);
  const exportSurfaceRef = useRef<HTMLElement | null>(null);
  const floatingToolbarRef = useRef<HTMLDivElement | null>(null);
  const floatingToolbarFrameRef = useRef<number | null>(null);
  const slashMenuRef = useRef<HTMLDivElement | null>(null);
  const visualEditorRef = useRef<Editor | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInsertionRef = useRef<{ end: number; start: number } | null>(null);
  const visualImageInsertionRef = useRef(false);
  const visualImagePositionRef = useRef<number | null>(null);
  const slashRef = useRef<{ end: number; query: string; start: number } | null>(null);
  const previousEditorModeRef = useRef<EditorMode>("edit");
  const loadedRef = useRef(false);
  const savedSnapshotRef = useRef("");
  const latestDraftRef = useRef({
    content: "",
    favorite: false,
    icon: "📝",
    title: "",
  });
  const [note, setNote] = useState<WorkspaceNote | null>(null);
  const [missing, setMissing] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [favorite, setFavorite] = useState(false);
  const [icon, setIcon] = useState("📝");
  const [mode, setMode] = useState<EditorMode>("edit");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "dirty">("saved");
  const [slash, setSlash] = useState<{ end: number; query: string; start: number } | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [wideSplit, setWideSplit] = useState(true);
  const [floatingToolbar, setFloatingToolbar] = useState<FloatingToolbarState | null>(null);
  const [slashPosition, setSlashPosition] = useState({ left: 16, top: 56 });
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [activeOutlineId, setActiveOutlineId] = useState<string | null>(null);
  const outline = useMemo(() => buildNoteOutline(content), [content]);
  const visualMarkdownSupport = useMemo(() => getVisualMarkdownSupport(content), [content]);
  const historySnapshot = useMemo<NoteHistorySnapshot>(
    () => ({ content, favorite, icon, title }),
    [content, favorite, icon, title]
  );
  const applyHistorySnapshot = useCallback((snapshot: NoteHistorySnapshot) => {
    setContent(snapshot.content);
    setFavorite(snapshot.favorite);
    setIcon(snapshot.icon);
    setTitle(snapshot.title);
    slashRef.current = null;
    setSlash(null);
    setSlashIndex(0);
    if (loadedRef.current) setSaveState("dirty");
  }, []);
  const {
    canRedo,
    canUndo,
    redo: redoNoteChange,
    reset: resetNoteHistory,
    undo: undoNoteChange,
  } = useUndoHistory({
    debounceMs: 350,
    onApply: applyHistorySnapshot,
    value: historySnapshot,
  });

  useEffect(() => {
    latestDraftRef.current = { content, favorite, icon, title };
  }, [content, favorite, icon, title]);

  useEffect(() => {
    if (!user) return;
    const storedNote = getNote(user.id, noteId);
    if (!storedNote) {
      setMissing(true);
      return;
    }
    setNote(storedNote);
    setTitle(storedNote.title);
    setContent(storedNote.content);
    setFavorite(storedNote.favorite);
    setIcon(storedNote.icon || "📝");
    resetNoteHistory({
      content: storedNote.content,
      favorite: storedNote.favorite,
      icon: storedNote.icon || "📝",
      title: storedNote.title,
    });
    savedSnapshotRef.current = JSON.stringify({
      content: storedNote.content,
      favorite: storedNote.favorite,
      icon: storedNote.icon || "📝",
      title: storedNote.title,
    });
    loadedRef.current = true;
  }, [noteId, resetNoteHistory, user]);

  useEffect(() => {
    if (!loadedRef.current || visualMarkdownSupport.supported || mode !== "edit") return;
    setMode("source");
    toast.info(
      ro
        ? "Am deschis modul Sursă pentru a păstra Markdown-ul avansat fără modificări."
        : "Opened Source mode to preserve advanced Markdown without changes."
    );
  }, [mode, ro, visualMarkdownSupport.supported]);

  useEffect(() => {
    const previousMode = previousEditorModeRef.current;
    previousEditorModeRef.current = mode;
    if (!loadedRef.current || previousMode !== "edit" || mode === "edit") return;

    // Tiptap owns fine-grained history while the visual editor is active.
    // Rebase the source-mode history when leaving it so an older parallel
    // snapshot cannot resurrect content that was already undone visually.
    resetNoteHistory({ content, favorite, icon, title });
  }, [content, favorite, icon, mode, resetNoteHistory, title]);

  useEffect(() => {
    if (!user || !note || !loadedRef.current) return;
    const normalizedTitle = title.trim() || (ro ? "Notiță fără titlu" : "Untitled note");
    const snapshot = JSON.stringify({ content, favorite, icon, title: normalizedTitle });
    if (snapshot === savedSnapshotRef.current) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      try {
        const updated = updateNote(user.id, note.id, {
          content,
          favorite,
          icon,
          title: normalizedTitle,
        });
        if (updated) setNote(updated);
        savedSnapshotRef.current = snapshot;
        setSaveState("saved");
      } catch (error) {
        setSaveState("dirty");
        toast.error(ro ? "Notița nu a putut fi salvată." : "Could not save the note.", {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [content, favorite, icon, note, ro, title, user]);

  useEffect(() => {
    const userId = user?.id;
    const currentNoteId = note?.id;
    if (!userId || !currentNoteId) return;

    return () => {
      const latest = latestDraftRef.current;
      const normalizedTitle =
        latest.title.trim() || (ro ? "Notiță fără titlu" : "Untitled note");
      const snapshot = JSON.stringify({
        content: latest.content,
        favorite: latest.favorite,
        icon: latest.icon,
        title: normalizedTitle,
      });
      if (snapshot === savedSnapshotRef.current) return;

      try {
        updateNote(userId, currentNoteId, {
          content: latest.content,
          favorite: latest.favorite,
          icon: latest.icon,
          title: normalizedTitle,
        });
        savedSnapshotRef.current = snapshot;
      } catch {
        // Navigation must not be blocked if browser storage becomes unavailable.
      }
    };
  }, [note?.id, ro, user?.id]);

  const filteredCommands = useMemo(() => {
    const query = slash?.query.toLocaleLowerCase(locale) || "";
    return slashCommands.filter((command) =>
      `${command.id} ${command.label[ro ? "ro" : "en"]}`
        .toLocaleLowerCase(locale)
        .includes(query)
    );
  }, [locale, ro, slash?.query]);

  useEffect(() => {
    setSlashIndex((current) =>
      filteredCommands.length ? Math.min(current, filteredCommands.length - 1) : 0
    );
  }, [filteredCommands.length]);

  useEffect(() => {
    if (!slash) return;
    slashMenuRef.current
      ?.querySelector<HTMLElement>(`[data-slash-index="${slashIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [slash, slashIndex]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setWideSplit(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    // Keep the server and first client render identical, then reveal the
    // persistent outline only where it has dedicated desktop space.
    setOutlineOpen(window.matchMedia("(min-width: 1280px)").matches);
  }, []);

  useEffect(() => {
    if (!outlineOpen) return;

    const closeOverlayOnEscape = (event: globalThis.KeyboardEvent) => {
      if (
        event.key !== "Escape" ||
        event.defaultPrevented ||
        !window.matchMedia("(max-width: 1279px)").matches ||
        slashRef.current
      ) {
        return;
      }
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('[role="dialog"], [role="listbox"], [role="menu"]')
      ) {
        return;
      }
      event.preventDefault();
      setOutlineOpen(false);
    };

    document.addEventListener("keydown", closeOverlayOnEscape);
    return () => document.removeEventListener("keydown", closeOverlayOnEscape);
  }, [outlineOpen]);

  useEffect(() => {
    if (mode !== "split" || !wideSplit) return;
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(SPLIT_LAYOUT_STORAGE_KEY);
        if (!stored) return;
        const layout = JSON.parse(stored) as Partial<Layout>;
        const editor = Number(layout.editor);
        const preview = Number(layout.preview);
        if (
          Number.isFinite(editor) &&
          Number.isFinite(preview) &&
          editor >= 25 &&
          editor <= 75 &&
          Math.abs(editor + preview - 100) < 1
        ) {
          splitGroupRef.current?.setLayout({ editor, preview });
        }
      } catch {
        // A corrupt preference should never block the editor.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [mode, splitGroupRef, wideSplit]);

  useEffect(() => {
    if (!floatingToolbar) return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (floatingToolbarRef.current?.contains(target) || target === textareaRef.current) return;
      setFloatingToolbar(null);
    };
    document.addEventListener("pointerdown", dismiss, true);
    return () => document.removeEventListener("pointerdown", dismiss, true);
  }, [floatingToolbar]);

  useEffect(
    () => () => {
      if (floatingToolbarFrameRef.current !== null) {
        window.cancelAnimationFrame(floatingToolbarFrameRef.current);
      }
    },
    []
  );

  function markDirty() {
    if (loadedRef.current) setSaveState("dirty");
  }

  function positionNearCursor(index: number, kind: "selection" | "slash") {
    const textarea = textareaRef.current;
    const surface = editorSurfaceRef.current;
    if (!textarea || !surface) return null;

    const caret = getTextareaCaretPosition(textarea, index);
    const textareaRect = textarea.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    const lineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight) || 28;
    const width = kind === "selection" ? 252 : 320;
    const height = kind === "selection" ? 42 : 330;
    const cursorLeft = textareaRect.left - surfaceRect.left + caret.left - textarea.scrollLeft;
    const cursorTop = textareaRect.top - surfaceRect.top + caret.top - textarea.scrollTop;
    const left = Math.max(10, Math.min(cursorLeft - width / 2, surface.clientWidth - width - 10));
    const above = cursorTop - height - 10;
    const below = cursorTop + lineHeight + 8;
    const preferredTop = kind === "selection" ? above : below;
    const fallbackTop = kind === "selection" ? below : above;
    const candidateTop =
      preferredTop >= 8 && preferredTop + height <= surface.clientHeight - 8
        ? preferredTop
        : fallbackTop;
    const top = Math.max(8, Math.min(candidateTop, surface.clientHeight - height - 8));

    return { left, top };
  }

  function updateFloatingToolbar() {
    const textarea = textareaRef.current;
    if (!textarea || textarea.selectionEnd <= textarea.selectionStart) {
      setFloatingToolbar(null);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const position = positionNearCursor(start, "selection");
    if (!position) return;
    closeSlash();
    setFloatingToolbar({ start, end, ...position });
  }

  function refreshFloatingToolbar() {
    if (floatingToolbarFrameRef.current !== null) {
      window.cancelAnimationFrame(floatingToolbarFrameRef.current);
    }
    floatingToolbarFrameRef.current = window.requestAnimationFrame(() => {
      floatingToolbarFrameRef.current = null;
      updateFloatingToolbar();
    });
  }

  function closeSlash() {
    slashRef.current = null;
    setSlash(null);
    setSlashIndex(0);
  }

  function updateSlash(value: string, cursor: number) {
    const lineStart = value.lastIndexOf("\n", Math.max(0, cursor - 1)) + 1;
    const token = value.slice(lineStart, cursor);
    const match = token.match(/^\/([\p{L}\p{N}-]*)$/u);
    const next = match
      ? { start: lineStart, end: cursor, query: match[1] }
      : null;
    const current = slashRef.current;
    if (
      current?.start !== next?.start ||
      current?.end !== next?.end ||
      current?.query !== next?.query
    ) {
      setSlashIndex(0);
    }
    slashRef.current = next;
    setSlash(next);
    if (next) {
      setFloatingToolbar(null);
      window.requestAnimationFrame(() => {
        const position = positionNearCursor(next.end, "slash");
        if (position) setSlashPosition(position);
      });
    }
  }

  function changeContent(event: ChangeEvent<HTMLTextAreaElement>) {
    setContent(event.target.value);
    updateSlash(event.target.value, event.target.selectionStart);
    setFloatingToolbar(null);
    markDirty();
  }

  function replaceSelection(
    prefix: string,
    suffix = prefix,
    placeholder = "text",
    range?: { end: number; start: number }
  ) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = range?.start ?? textarea.selectionStart;
    const end = range?.end ?? textarea.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const next = `${content.slice(0, start)}${prefix}${selected}${suffix}${content.slice(end)}`;
    setContent(next);
    closeSlash();
    setFloatingToolbar(null);
    markDirty();
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  }

  function insertLinePrefix(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const cursor = textarea.selectionStart;
    const lineStart = content.lastIndexOf("\n", Math.max(0, cursor - 1)) + 1;
    const next = `${content.slice(0, lineStart)}${prefix}${content.slice(lineStart)}`;
    setContent(next);
    closeSlash();
    setFloatingToolbar(null);
    markDirty();
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(cursor + prefix.length, cursor + prefix.length);
    });
  }

  function focusOutlineItem(item: ReturnType<typeof buildNoteOutline>[number]) {
    setActiveOutlineId(item.id);
    if (mode === "source" || mode === "split") {
      const textarea = textareaRef.current;
      if (!textarea) {
        setMode("source");
        window.requestAnimationFrame(() => focusOutlineItem(item));
        return;
      }
      textarea.focus();
      textarea.setSelectionRange(item.offset, item.offset);
      const lineHeight = Number.parseFloat(window.getComputedStyle(textarea).lineHeight) || 28;
      textarea.scrollTo({ behavior: "smooth", top: Math.max(0, (item.line - 3) * lineHeight) });
      return;
    }

    const visualEditor = visualEditorRef.current;
    if (!visualEditor) return;
    const targetText = item.text.toLocaleLowerCase(locale);
    let targetPosition: number | null = null;
    visualEditor.state.doc.descendants((node, position) => {
      if (targetPosition !== null || !node.isTextblock) return;
      if (node.textContent.trim().toLocaleLowerCase(locale).includes(targetText)) {
        targetPosition = position + 1;
      }
    });
    if (targetPosition !== null) {
      visualEditor.chain().focus().setTextSelection(targetPosition).scrollIntoView().run();
    }
  }

  function formatSelectionAsHeading(range: { end: number; start: number }) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const lineStart = content.lastIndexOf("\n", Math.max(0, range.start - 1)) + 1;
    const selectedLine = content.slice(lineStart);
    const existingHeading = selectedLine.match(/^#{1,6}\s+/)?.[0] || "";
    const next = `${content.slice(0, lineStart)}## ${content.slice(
      lineStart + existingHeading.length
    )}`;
    const delta = 3 - existingHeading.length;
    setContent(next);
    closeSlash();
    setFloatingToolbar(null);
    markDirty();
    window.requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        Math.max(lineStart + 3, range.start + delta),
        Math.max(lineStart + 3, range.end + delta)
      );
    });
  }

  function formatFloatingSelection(action: "bold" | "code" | "heading" | "italic" | "link") {
    if (!floatingToolbar) return;
    const range = { start: floatingToolbar.start, end: floatingToolbar.end };
    if (action === "heading") {
      formatSelectionAsHeading(range);
    } else if (action === "bold") {
      replaceSelection("**", "**", "text", range);
    } else if (action === "italic") {
      replaceSelection("_", "_", "text", range);
    } else if (action === "code") {
      replaceSelection("`", "`", "code", range);
    } else {
      replaceSelection("[", "](https://)", "link", range);
    }
  }

  function applySlashCommand(command: SlashCommand) {
    if (!slash) return;
    if (command.action === "image-url" || command.action === "image-upload") {
      const insertionPoint = slash.start;
      setContent(`${content.slice(0, slash.start)}${content.slice(slash.end)}`);
      markDirty();
      const range = { start: insertionPoint, end: insertionPoint };
      imageInsertionRef.current = range;
      setImageAlt("");
      setImageUrl("");
      closeSlash();
      if (command.action === "image-url") {
        setImageDialogOpen(true);
      } else {
        window.requestAnimationFrame(() => fileInputRef.current?.click());
      }
      return;
    }
    const next = `${content.slice(0, slash.start)}${command.value}${content.slice(slash.end)}`;
    const cursor = slash.start + command.value.length - (command.id === "code" ? 4 : 0);
    setContent(next);
    closeSlash();
    markDirty();
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  function onEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (slash && filteredCommands.length) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setSlashIndex((current) =>
          (current + direction + filteredCommands.length) % filteredCommands.length
        );
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        applySlashCommand(filteredCommands[slashIndex] || filteredCommands[0]);
        return;
      }
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
      event.preventDefault();
      event.stopPropagation();
      replaceSelection("**");
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
      event.preventDefault();
      event.stopPropagation();
      replaceSelection("_");
      return;
    }
    if (event.altKey && event.key === "F10" && floatingToolbar) {
      event.preventDefault();
      floatingToolbarRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      return;
    }
    if (event.key === "Tab" && floatingToolbar) {
      event.preventDefault();
      floatingToolbarRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      return;
    }
    if (event.key === "Escape") closeSlash();
    if (event.key === "Tab") {
      event.preventDefault();
      replaceSelection("  ", "", "");
    }
  }

  function onEditorKeyUp(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(event.key)) return;
    updateSlash(event.currentTarget.value, event.currentTarget.selectionStart);
    trackSourceOutline(event.currentTarget.selectionStart);
    refreshFloatingToolbar();
  }

  function trackSourceOutline(offset: number) {
    const active = outline.reduce<(typeof outline)[number] | null>(
      (candidate, item) => (item.offset <= offset ? item : candidate),
      null
    );
    setActiveOutlineId(active?.id ?? null);
  }

  function onEditorShortcut(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest(".ProseMirror")) return;
    const key = event.key.toLowerCase();
    const modifierPressed = event.metaKey || event.ctrlKey;
    if (!modifierPressed || event.altKey || (key !== "z" && key !== "y")) return;

    event.preventDefault();
    event.stopPropagation();
    if (key === "y" || event.shiftKey) {
      redoNoteChange();
    } else {
      undoNoteChange();
    }
  }

  function openImageDialog(range?: { end: number; start: number }) {
    visualImageInsertionRef.current = false;
    const textarea = textareaRef.current;
    const target = range || {
      start: textarea?.selectionStart ?? content.length,
      end: textarea?.selectionEnd ?? content.length,
    };
    const selected = content.slice(target.start, target.end);
    imageInsertionRef.current = target;
    setImageAlt(selected.includes("\n") || selected.startsWith("/") ? "" : selected);
    setImageUrl("");
    setImageDialogOpen(true);
  }

  function openVisualImageDialog() {
    visualImageInsertionRef.current = true;
    visualImagePositionRef.current = visualEditorRef.current?.state.selection.from ?? null;
    imageInsertionRef.current = null;
    setImageAlt("");
    setImageUrl("");
    setImageDialogOpen(true);
  }

  function resetImageDialog() {
    visualImageInsertionRef.current = false;
    visualImagePositionRef.current = null;
    imageInsertionRef.current = null;
    setImageAlt("");
    setImageUrl("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function insertMarkdownImage(source: string, alt: string) {
    if (visualImageInsertionRef.current && visualEditorRef.current) {
      const chain = visualEditorRef.current.chain().focus();
      const position = visualImagePositionRef.current;
      if (position !== null) chain.setTextSelection(position);
      chain.setImage({ src: source, alt: alt.trim() }).run();
      setImageDialogOpen(false);
      resetImageDialog();
      return;
    }
    const textarea = textareaRef.current;
    const target = imageInsertionRef.current || {
      start: textarea?.selectionStart ?? content.length,
      end: textarea?.selectionEnd ?? content.length,
    };
    const escapedAlt = alt
      .trim()
      .replace(/\\/g, "\\\\")
      .replace(/[\[\]]/g, "\\$&")
      .replace(/\s+/g, " ");
    const safeSource = source.startsWith("workspace-image://")
      ? source
      : `<${source.replace(/[<>]/g, (character) =>
          character === "<" ? "%3C" : "%3E"
        )}>`;
    const markdown = `![${escapedAlt}](${safeSource})`;
    const before = content.slice(0, target.start);
    const after = content.slice(target.end);
    const leading = before && !before.endsWith("\n") ? "\n\n" : "";
    const trailing = after && !after.startsWith("\n") ? "\n\n" : "";
    const insertion = `${leading}${markdown}${trailing}`;
    const next = `${before}${insertion}${after}`;
    const cursor = before.length + insertion.length;
    setContent(next);
    closeSlash();
    markDirty();
    setImageDialogOpen(false);
    resetImageDialog();
    window.requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(cursor, cursor);
    });
  }

  function addImageFromUrl() {
    try {
      const url = new URL(imageUrl.trim());
      if ((url.protocol !== "https:" && url.protocol !== "http:") || url.href.length > 2_048) {
        throw new Error();
      }
      insertMarkdownImage(url.href, imageAlt);
    } catch {
      toast.error(ro ? "Introdu un URL HTTP sau HTTPS valid." : "Enter a valid HTTP or HTTPS URL.");
    }
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setUploadingImage(true);
    try {
      const asset = await saveWorkspaceImage(user.id, file);
      insertMarkdownImage(asset.url, imageAlt || file.name.replace(/\.[^.]+$/, ""));
      toast.success(ro ? "Imagine adăugată în notiță." : "Image added to the note.");
    } catch (error) {
      toast.error(ro ? "Imaginea nu a putut fi încărcată." : "Could not upload the image.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  function saveSplitLayout(layout: Layout, meta: LayoutChangedMeta) {
    if (!meta.isUserInteraction) return;
    try {
      window.localStorage.setItem(SPLIT_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // Resizing still works when browser storage is unavailable.
    }
  }

  function exportFileName(extension: ExportFormat) {
    const base = (title.trim() || "note")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9-_]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "note";
    return `${base}.${extension}`;
  }

  function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  async function buildSelfContainedHtml() {
    const source = exportSurfaceRef.current;
    if (!source) throw new Error(ro ? "Preview-ul nu este pregătit." : "Preview is not ready.");
    const clone = source.cloneNode(true) as HTMLElement;
    const sourceImages = Array.from(source.querySelectorAll("img"));
    const clonedImages = Array.from(clone.querySelectorAll("img"));
    let omittedImages = 0;

    await Promise.all(
      clonedImages.map(async (image, index) => {
        const sourceImage = sourceImages[index];
        const sourceUrl = sourceImage?.currentSrc || sourceImage?.src || image.src;
        if (!sourceUrl) return;
        try {
          const response = await fetch(sourceUrl);
          if (!response.ok) throw new Error();
          image.src = await blobToDataUrl(await response.blob());
          image.removeAttribute("srcset");
        } catch {
          omittedImages += 1;
          const fallback = document.createElement("span");
          fallback.textContent = image.alt
            ? `[${image.alt}]`
            : ro
              ? "[Imagine indisponibilă offline]"
              : "[Image unavailable offline]";
          fallback.setAttribute("role", "img");
          fallback.setAttribute("aria-label", image.alt || "Image");
          image.replaceWith(fallback);
        }
      })
    );

    clone.querySelectorAll("script, iframe, object, embed").forEach((element) => element.remove());
    clone.querySelectorAll("*").forEach((element) => {
      for (const attribute of Array.from(element.attributes)) {
        if (attribute.name.toLowerCase().startsWith("on")) {
          element.removeAttribute(attribute.name);
        }
      }
    });

    const safeTitle = escapeHtml(title.trim() || (ro ? "Notiță" : "Note"));
    const html = `<!doctype html>
<html lang="${ro ? "ro" : "en"}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: Canvas; color: CanvasText; }
    article { box-sizing: border-box; width: min(100% - 40px, 840px); margin: 0 auto; padding: 64px 0 96px; font-size: 16px; line-height: 1.75; }
    h1 { margin: 0 0 36px; font-size: clamp(2.25rem, 7vw, 3.5rem); line-height: 1.05; }
    h2, h3, h4 { line-height: 1.25; margin: 2em 0 .7em; }
    p, ul, ol, blockquote, pre, table { margin: 1em 0; }
    a { color: #2563eb; text-underline-offset: 3px; }
    blockquote { margin-left: 0; padding-left: 1rem; border-left: 3px solid #94a3b8; color: color-mix(in srgb, CanvasText 72%, transparent); }
    code { border-radius: 5px; background: color-mix(in srgb, CanvasText 8%, transparent); padding: .15em .35em; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    pre { overflow: auto; border: 1px solid color-mix(in srgb, CanvasText 14%, transparent); border-radius: 10px; padding: 1rem; background: color-mix(in srgb, CanvasText 5%, transparent); }
    pre code { padding: 0; background: transparent; }
    img { display: block; max-width: 100%; height: auto; margin: 1.5rem auto; border-radius: 10px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid color-mix(in srgb, CanvasText 16%, transparent); padding: .55rem .75rem; text-align: left; }
    @media print { article { width: auto; padding: 24px; } }
  </style>
</head>
<body>${clone.outerHTML}</body>
</html>`;
    return { html, omittedImages };
  }

  async function exportNote(format: ExportFormat) {
    setExporting(format);
    setFloatingToolbar(null);
    try {
      if (format !== "md") {
        const surface = exportSurfaceRef.current;
        if (!surface) throw new Error(ro ? "Preview-ul nu este pregătit." : "Preview is not ready.");
        const imagesReady = await waitForExportImages(surface);
        if (!imagesReady) {
          toast.warning(
            ro
              ? "Unele imagini încă se încărcau și pot apărea ca placeholder."
              : "Some images were still loading and may appear as placeholders."
          );
        }
      }
      if (format === "md") {
        downloadBlob(
          new Blob([content], { type: "text/markdown;charset=utf-8" }),
          exportFileName("md")
        );
      } else if (format === "html") {
        const { html, omittedImages } = await buildSelfContainedHtml();
        downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), exportFileName("html"));
        if (omittedImages) {
          toast.warning(
            ro
              ? `${omittedImages} imagini externe nu au permis exportul offline.`
              : `${omittedImages} external images could not be embedded offline.`
          );
        }
      } else {
        const surface = exportSurfaceRef.current;
        if (!surface) throw new Error(ro ? "Preview-ul nu este pregătit." : "Preview is not ready.");
        await document.fonts.ready;
        const { toPng } = await import("html-to-image");
        const height = Math.max(surface.scrollHeight, surface.getBoundingClientRect().height);
        const pixelRatio = Math.max(1, Math.min(2, 12_000 / Math.max(height, 1)));
        const dataUrl = await toPng(surface, {
          backgroundColor: window.getComputedStyle(surface).backgroundColor || "#ffffff",
          cacheBust: true,
          imagePlaceholder: "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=",
          pixelRatio,
        });

        if (format === "png") {
          const anchor = document.createElement("a");
          anchor.href = dataUrl;
          anchor.download = exportFileName("png");
          anchor.click();
        } else {
          const { jsPDF } = await import("jspdf");
          const pdf = new jsPDF({ compress: true, format: "a4", orientation: "portrait", unit: "mm" });
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const margin = 12;
          const usableWidth = pageWidth - margin * 2;
          const usableHeight = pageHeight - margin * 2;
          const image = pdf.getImageProperties(dataUrl);
          const renderedHeight = (image.height * usableWidth) / image.width;
          const pageCount = Math.max(1, Math.ceil(renderedHeight / usableHeight));
          for (let page = 0; page < pageCount; page += 1) {
            if (page) pdf.addPage();
            pdf.addImage(
              dataUrl,
              "PNG",
              margin,
              margin - page * usableHeight,
              usableWidth,
              renderedHeight,
              undefined,
              "FAST"
            );
          }
          pdf.setProperties({ title: title.trim() || (ro ? "Notiță" : "Note") });
          pdf.save(exportFileName("pdf"));
        }
      }
      toast.success(ro ? "Export pregătit." : "Export ready.");
    } catch (error) {
      toast.error(ro ? "Exportul nu a putut fi creat." : "Could not create the export.", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setExporting(null);
    }
  }

  if (missing) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center text-center">
        <FileTextIcon />
        <h1 className="mt-4 text-xl font-semibold">{ro ? "Notița nu există" : "Note not found"}</h1>
        <Button className="mt-5" onClick={() => router.replace("/workspace/student/notes")}>
          <ArrowLeft className="size-4" />
          {ro ? "Înapoi la bibliotecă" : "Back to library"}
        </Button>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center text-muted-foreground">
        <LoaderCircle className="size-5 animate-spin" />
      </div>
    );
  }

  const effectiveMode: EditorMode =
    mode === "edit" && !visualMarkdownSupport.supported
      ? "source"
      : mode === "split" && !wideSplit
        ? "source"
        : mode;

  const undoCurrentEditor = () => {
    if (effectiveMode === "edit" && visualEditorRef.current) {
      visualEditorRef.current.commands.undo();
      return;
    }
    undoNoteChange();
  };

  const redoCurrentEditor = () => {
    if (effectiveMode === "edit" && visualEditorRef.current) {
      visualEditorRef.current.commands.redo();
      return;
    }
    redoNoteChange();
  };

  const sourcePane = (
    <div
      ref={editorSurfaceRef}
      className="relative h-full min-h-0 overflow-hidden bg-background"
    >
      <textarea
        ref={textareaRef}
        aria-activedescendant={
          slash && filteredCommands[slashIndex]
            ? `note-slash-${filteredCommands[slashIndex].id}`
            : undefined
        }
        aria-autocomplete="list"
        aria-controls={slash ? "note-slash-menu" : undefined}
        aria-expanded={Boolean(slash && filteredCommands.length)}
        aria-haspopup="listbox"
        role="combobox"
        value={content}
        onChange={changeContent}
        onClick={(event) => {
          updateSlash(event.currentTarget.value, event.currentTarget.selectionStart);
          trackSourceOutline(event.currentTarget.selectionStart);
          refreshFloatingToolbar();
        }}
        onKeyUp={onEditorKeyUp}
        onKeyDown={onEditorKeyDown}
        onMouseUp={refreshFloatingToolbar}
        onScroll={() => {
          setFloatingToolbar(null);
          if (slashRef.current) {
            const position = positionNearCursor(slashRef.current.end, "slash");
            if (position) setSlashPosition(position);
          }
        }}
        onSelect={(event) => {
          trackSourceOutline(event.currentTarget.selectionStart);
          refreshFloatingToolbar();
        }}
        spellCheck
        className="mx-auto block h-full min-h-0 w-full max-w-4xl resize-none bg-transparent px-6 py-10 font-mono text-[14px] leading-7 outline-none placeholder:text-muted-foreground/60 selection:bg-primary/20 sm:px-10 sm:py-14"
        placeholder={
          ro
            ? "Scrie notițele aici... Tastează / pentru blocuri."
            : "Write your notes here... Type / for blocks."
        }
      />

      {floatingToolbar ? (
        <div
          ref={floatingToolbarRef}
          aria-label={ro ? "Formatare text selectat" : "Selected text formatting"}
          className="absolute z-30 flex items-center gap-0.5 rounded-lg border border-border/70 bg-popover/95 p-1 text-popover-foreground shadow-[0_12px_40px_-12px_rgba(0,0,0,0.35)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-150"
          onKeyDown={(event) => {
            if (event.key !== "Escape") return;
            event.preventDefault();
            setFloatingToolbar(null);
            textareaRef.current?.focus();
            textareaRef.current?.setSelectionRange(floatingToolbar.start, floatingToolbar.end);
          }}
          onMouseDown={(event) => event.preventDefault()}
          role="toolbar"
          style={{ left: floatingToolbar.left, top: floatingToolbar.top }}
        >
          <FloatingToolbarButton
            icon={Bold}
            label={ro ? "Aldin" : "Bold"}
            onClick={() => formatFloatingSelection("bold")}
          />
          <FloatingToolbarButton
            icon={Italic}
            label={ro ? "Cursiv" : "Italic"}
            onClick={() => formatFloatingSelection("italic")}
          />
          <FloatingToolbarButton
            icon={Heading1}
            label={ro ? "Transformă în titlu" : "Turn into heading"}
            onClick={() => formatFloatingSelection("heading")}
          />
          <FloatingToolbarButton
            icon={Link2}
            label={ro ? "Adaugă link" : "Add link"}
            onClick={() => formatFloatingSelection("link")}
          />
          <FloatingToolbarButton
            icon={Code2}
            label={ro ? "Cod inline" : "Inline code"}
            onClick={() => formatFloatingSelection("code")}
          />
        </div>
      ) : null}

      {slash && filteredCommands.length ? (
        <div
          ref={slashMenuRef}
          aria-label={ro ? "Blocuri Markdown" : "Markdown blocks"}
          id="note-slash-menu"
          className="absolute z-20 max-h-[min(23rem,calc(100%-1rem))] w-[min(20rem,calc(100%-1rem))] overflow-y-auto rounded-xl border border-border/70 bg-popover/95 p-1.5 text-popover-foreground shadow-[0_18px_60px_-18px_rgba(0,0,0,0.4)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-150"
          role="listbox"
          style={{ left: slashPosition.left, top: slashPosition.top }}
        >
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            {ro ? "Blocuri" : "Blocks"}
          </p>
          {filteredCommands.map((command, index) => {
            const Icon = command.icon;
            return (
              <button
                key={command.id}
                type="button"
                aria-selected={slashIndex === index}
                data-slash-index={index}
                id={`note-slash-${command.id}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setSlashIndex(index)}
                onClick={() => applySlashCommand(command)}
                role="option"
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm outline-none motion-safe:transition-colors motion-safe:duration-150",
                  slashIndex === index
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/70"
                )}
              >
                <span className="flex size-8 items-center justify-center rounded-md border border-border/70 bg-background/80">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {command.label[ro ? "ro" : "en"]}
                </span>
                {command.hint ? (
                  <span className="max-w-28 truncate text-[11px] text-muted-foreground">
                    {command.hint}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );

  const visualPane = (
    <div className="h-full min-h-0 overflow-y-auto scroll-smooth bg-background">
      <NotionMarkdownSurface
        content={content}
        editorRef={visualEditorRef}
        onChange={(markdown) => {
          setContent(markdown);
          markDirty();
        }}
        onActiveText={(activeText) => {
          if (!activeText) return;
          const normalized = activeText.toLocaleLowerCase(locale);
          const item = outline.find((candidate) =>
            normalized.includes(candidate.text.toLocaleLowerCase(locale))
          );
          if (item) setActiveOutlineId(item.id);
        }}
        onOpenImage={openVisualImageDialog}
        onTitleChange={(nextTitle) => {
          setTitle(nextTitle);
          markDirty();
        }}
        placeholder={
          ro
            ? "Începe să scrii sau tastează / pentru formatare…"
            : "Start writing or type / for formatting…"
        }
        ro={ro}
        title={title}
        userId={user?.id}
      />
    </div>
  );

  const previewPane = (
    <article className="h-full min-h-0 overflow-y-auto bg-background px-6 py-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 sm:px-10 lg:px-12">
      <div className="mx-auto max-w-3xl">
        <FileText className="mb-5 size-5 text-muted-foreground/65" aria-hidden="true" />
        <h1 className="mb-8 text-4xl font-bold">{title}</h1>
        {content.trim() ? (
          <Markdown workspaceImageUserId={user?.id}>{content}</Markdown>
        ) : (
          <p className="text-sm text-muted-foreground">
            {ro ? "Preview-ul va apărea aici." : "Your preview will appear here."}
          </p>
        )}
      </div>
    </article>
  );

  return (
    <>
      <input
        ref={fileInputRef}
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={uploadImage}
        type="file"
      />
      <div
        className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background"
        onKeyDownCapture={onEditorShortcut}
      >
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-background/95 px-3 py-2.5 backdrop-blur-xl sm:px-4">
        <Button asChild variant="ghost" size="icon" className="size-9 shrink-0">
          <Link href="/workspace/student/notes" aria-label={ro ? "Înapoi" : "Back"}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <span
          className="flex size-8 shrink-0 items-center justify-center text-muted-foreground"
          aria-hidden="true"
        >
          <FileText className="size-4" />
        </span>
        <input
          value={title}
          onChange={(event) => {
            setTitle(event.target.value.slice(0, 100));
            markDirty();
          }}
          onBlur={() => {
            if (!title.trim()) setTitle(ro ? "Notiță fără titlu" : "Untitled note");
          }}
          className="h-9 min-w-32 flex-1 bg-transparent px-1 text-sm font-semibold outline-none placeholder:text-muted-foreground"
          placeholder={ro ? "Titlul paginii" : "Page title"}
        />

        <span className="mr-1 hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex" aria-live="polite">
          {saveState === "saving" ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          {saveState === "saving"
            ? ro ? "Se salvează..." : "Saving..."
            : saveState === "dirty"
              ? ro ? "Modificat" : "Edited"
              : ro ? "Salvat" : "Saved"}
        </span>

        <div className="hidden items-center sm:flex">
          <Button
            aria-label={ro ? "Anulează ultima modificare" : "Undo last change"}
            className="size-8"
            disabled={effectiveMode !== "edit" && !canUndo}
            onClick={undoCurrentEditor}
            size="icon"
            title={ro ? "Anulează (Cmd/Ctrl+Z)" : "Undo (Cmd/Ctrl+Z)"}
            type="button"
            variant="ghost"
          >
            <Undo2 className="size-4" />
          </Button>
          <Button
            aria-label={ro ? "Refă ultima modificare" : "Redo last change"}
            className="size-8"
            disabled={effectiveMode !== "edit" && !canRedo}
            onClick={redoCurrentEditor}
            size="icon"
            title={ro ? "Refă (Cmd/Ctrl+Shift+Z)" : "Redo (Cmd/Ctrl+Shift+Z)"}
            type="button"
            variant="ghost"
          >
            <Redo2 className="size-4" />
          </Button>
        </div>

        <div className="flex items-center rounded-lg bg-muted p-0.5">
          {([
            { id: "edit", icon: FileText, label: ro ? "Editare vizuală" : "Visual edit" },
            { id: "source", icon: Braces, label: ro ? "Sursă Markdown" : "Markdown source" },
            { id: "split", icon: Columns2, label: ro ? "Împărțit" : "Split" },
            { id: "preview", icon: Eye, label: ro ? "Preview" : "Preview" },
          ] as const).map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                title={option.label}
                aria-label={option.label}
                aria-pressed={mode === option.id}
                onClick={() => {
                  if (option.id === "edit" && !visualMarkdownSupport.supported) {
                    toast.warning(ro ? "Markdown avansat detectat. Folosește modul Sursă pentru a evita pierderile." : "Advanced Markdown detected. Use Source mode to avoid data loss.");
                    setMode("source");
                  } else setMode(option.id);
                }}
                className={cn(
                  "flex size-8 items-center justify-center rounded-md text-muted-foreground motion-safe:transition-all motion-safe:duration-150",
                  option.id === "split" && "hidden lg:flex",
                  mode === option.id && "bg-background text-foreground shadow-sm"
                )}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
        <Button
          aria-expanded={outlineOpen}
          aria-label={ro ? "Arată sau ascunde cuprinsul" : "Show or hide outline"}
          className="size-9"
          onClick={() => setOutlineOpen((current) => !current)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ListChecks className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9"
          onClick={() => {
            setFavorite((current) => !current);
            markDirty();
          }}
          aria-label={ro ? "Favorită" : "Favorite"}
        >
          <Star className={cn("size-4", favorite && "fill-amber-400 text-amber-400")} />
        </Button>
        <DropdownMenu
          onOpenChange={(open) => {
            if (open) setFloatingToolbar(null);
          }}
        >
          <DropdownMenuTrigger asChild>
            <Button
              aria-label={ro ? "Exportă notița" : "Export note"}
              className="size-9"
              disabled={Boolean(exporting)}
              size="icon"
              title={ro ? "Exportă notița" : "Export note"}
              type="button"
              variant="ghost"
            >
              {exporting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 p-1.5" sideOffset={7}>
            <DropdownMenuLabel className="px-2 py-1.5">
              {ro ? "Exportă ca" : "Export as"}
            </DropdownMenuLabel>
            <ExportMenuItem
              description="Markdown"
              icon={FileText}
              label=".MD"
              onSelect={() => void exportNote("md")}
            />
            <ExportMenuItem
              description={ro ? "Pagină web offline" : "Offline web page"}
              icon={FileCode2}
              label=".HTML"
              onSelect={() => void exportNote("html")}
            />
            <ExportMenuItem
              description={ro ? "Document paginat A4" : "Paginated A4 document"}
              icon={FileDown}
              label=".PDF"
              onSelect={() => void exportNote("pdf")}
            />
            <ExportMenuItem
              description={ro ? "Imagine la rezoluție mare" : "High-resolution image"}
              icon={FileImage}
              label=".PNG"
              onSelect={() => void exportNote("png")}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex shrink-0 items-center gap-3 overflow-x-auto border-b bg-muted/10 px-3 py-1.5 sm:px-4">
        <Menubar className="h-8 shrink-0 border-0 bg-transparent p-0 shadow-none">
          <MenubarMenu>
            <MenubarTrigger>{ro ? "Fișier" : "File"}</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onSelect={() => void exportNote("md")}>Markdown <MenubarShortcut>.md</MenubarShortcut></MenubarItem>
              <MenubarItem onSelect={() => void exportNote("html")}>HTML <MenubarShortcut>.html</MenubarShortcut></MenubarItem>
              <MenubarItem onSelect={() => void exportNote("pdf")}>PDF <MenubarShortcut>.pdf</MenubarShortcut></MenubarItem>
              <MenubarItem onSelect={() => void exportNote("png")}>PNG <MenubarShortcut>.png</MenubarShortcut></MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>{ro ? "Editare" : "Edit"}</MenubarTrigger>
            <MenubarContent>
              <MenubarItem disabled={effectiveMode !== "edit" && !canUndo} onSelect={undoCurrentEditor}>{ro ? "Anulează" : "Undo"}<MenubarShortcut>⌘Z</MenubarShortcut></MenubarItem>
              <MenubarItem disabled={effectiveMode !== "edit" && !canRedo} onSelect={redoCurrentEditor}>{ro ? "Refă" : "Redo"}<MenubarShortcut>⇧⌘Z</MenubarShortcut></MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>{ro ? "Inserează" : "Insert"}</MenubarTrigger>
            <MenubarContent>
              <MenubarItem onSelect={() => effectiveMode === "edit" ? visualEditorRef.current?.chain().focus().toggleHeading({ level: 2 }).run() : insertLinePrefix("## ")}>{ro ? "Titlu" : "Heading"}</MenubarItem>
              <MenubarItem onSelect={() => effectiveMode === "edit" ? visualEditorRef.current?.chain().focus().toggleBulletList().run() : insertLinePrefix("- ")}>{ro ? "Listă" : "List"}</MenubarItem>
              <MenubarItem onSelect={() => effectiveMode === "edit" ? visualEditorRef.current?.chain().focus().toggleTaskList().run() : insertLinePrefix("- [ ] ")}>{ro ? "Checkpoint" : "Checkpoint"}</MenubarItem>
              <MenubarItem onSelect={() => effectiveMode === "edit" ? visualEditorRef.current?.chain().focus().toggleBlockquote().run() : insertLinePrefix("> ")}>{ro ? "Citat" : "Quote"}</MenubarItem>
              <MenubarSeparator />
              <MenubarItem onSelect={() => effectiveMode === "edit" ? openVisualImageDialog() : openImageDialog()}>{ro ? "Imagine…" : "Image…"}</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>{ro ? "Vizualizare" : "View"}</MenubarTrigger>
            <MenubarContent>
              <MenubarRadioGroup value={mode} onValueChange={(value) => {
                if (value === "edit" && !visualMarkdownSupport.supported) {
                  toast.warning(ro ? "Markdown-ul avansat rămâne protejat în modul Sursă." : "Advanced Markdown stays protected in Source mode.");
                  setMode("source");
                } else setMode(value as EditorMode);
              }}>
                <MenubarRadioItem disabled={!visualMarkdownSupport.supported} value="edit">{ro ? "Editor vizual" : "Visual editor"}</MenubarRadioItem>
                <MenubarRadioItem value="source">{ro ? "Sursă Markdown" : "Markdown source"}</MenubarRadioItem>
                <MenubarRadioItem value="split">Split</MenubarRadioItem>
                <MenubarRadioItem value="preview">Preview</MenubarRadioItem>
              </MenubarRadioGroup>
              <MenubarSeparator />
              <MenubarCheckboxItem checked={outlineOpen} onCheckedChange={(checked) => setOutlineOpen(checked === true)}>
                {ro ? "Cuprins & checkpoints" : "Outline & checkpoints"}
              </MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <span className="ml-auto hidden whitespace-nowrap text-[11px] text-muted-foreground sm:inline">
          {effectiveMode === "edit"
            ? ro ? "/ deschide meniul de blocuri" : "/ opens the block menu"
            : ro ? "Markdown salvat automat" : "Markdown autosaved"}
        </span>
      </div>

      <main className="relative flex min-h-0 flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-hidden">
          {effectiveMode === "split" ? (
          <Group
            className="h-full min-h-0"
            defaultLayout={{ editor: 50, preview: 50 }}
            groupRef={splitGroupRef}
            id="workspace-note-editor-split"
            onLayoutChanged={saveSplitLayout}
            orientation="horizontal"
          >
            <Panel id="editor" minSize="25%" maxSize="75%">
              {sourcePane}
            </Panel>
            <Separator
              aria-label={ro ? "Redimensionează editorul și preview-ul" : "Resize editor and preview"}
              className="group relative w-2 cursor-col-resize bg-background outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-inset"
              id="workspace-note-editor-separator"
              title={
                ro
                  ? "Trage pentru redimensionare · dublu-click pentru 50/50"
                  : "Drag to resize · double-click to reset 50/50"
              }
            >
              <span className="pointer-events-none absolute inset-y-0 left-1/2 flex w-px -translate-x-1/2 items-center justify-center bg-border motion-safe:transition-all motion-safe:duration-150 group-hover:w-0.5 group-hover:bg-primary/55 group-data-[separator=active]:w-0.5 group-data-[separator=active]:bg-primary">
                <span className="flex h-8 w-3 items-center justify-center rounded-full border border-border/80 bg-background text-muted-foreground opacity-0 shadow-sm motion-safe:transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  <GripVertical className="size-3" />
                </span>
              </span>
            </Separator>
            <Panel id="preview" minSize="25%" maxSize="75%">
              {previewPane}
            </Panel>
          </Group>
          ) : effectiveMode === "edit" ? (
          <div className="h-full motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
            {visualPane}
          </div>
          ) : effectiveMode === "source" ? (
            <div className="h-full motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
              {sourcePane}
            </div>
          ) : (
          previewPane
          )}
        </div>
        {outlineOpen ? (
          <>
            <button
              aria-label={ro ? "Închide cuprinsul" : "Close outline"}
              className="absolute inset-0 z-10 bg-background/35 backdrop-blur-[1px] motion-safe:animate-in motion-safe:fade-in xl:hidden"
              onClick={() => setOutlineOpen(false)}
              type="button"
            />
            <NoteOutlinePanel
              activeId={activeOutlineId}
              items={outline}
              onClose={() => setOutlineOpen(false)}
              onSelect={focusOutlineItem}
              ro={ro}
            />
          </>
        ) : (
          <button
            aria-label={ro ? "Deschide cuprinsul" : "Open outline"}
            className="absolute right-3 top-3 z-20 flex size-9 items-center justify-center rounded-full border bg-background/90 text-muted-foreground shadow-sm backdrop-blur-lg transition-all hover:scale-105 hover:text-foreground xl:static xl:my-3 xl:mr-3"
            onClick={() => setOutlineOpen(true)}
            type="button"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}
      </main>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -left-[10000px] top-0 w-[840px] opacity-0"
      >
        <article
          ref={exportSurfaceRef}
          className="min-h-[1120px] w-[840px] bg-white px-16 py-16 text-slate-950 dark:bg-slate-950 dark:text-slate-50"
        >
          <FileText className="mb-5 size-5 text-slate-400" aria-hidden="true" />
          <h1 className="mb-8 text-5xl font-bold">{title}</h1>
          {content.trim() ? (
            <Markdown workspaceImageUserId={user?.id}>{content}</Markdown>
          ) : (
            <p className="text-sm text-slate-500">
              {ro ? "Notiță fără conținut." : "Empty note."}
            </p>
          )}
        </article>
      </div>
    </div>

    <Dialog
      open={imageDialogOpen}
      onOpenChange={(open) => {
        if (!open && uploadingImage) return;
        setImageDialogOpen(open);
        if (!open) resetImageDialog();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ro ? "Adaugă o imagine" : "Add an image"}</DialogTitle>
          <DialogDescription>
            {ro
              ? "Folosește un URL public sau încarcă o imagine de maximum 8 MB."
              : "Use a public URL or upload an image up to 8 MB."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <label className="grid gap-1.5 text-xs font-medium" htmlFor="note-image-alt">
            {ro ? "Descriere (alt text)" : "Description (alt text)"}
            <Input
              autoFocus
              id="note-image-alt"
              maxLength={180}
              onChange={(event) => setImageAlt(event.target.value)}
              placeholder={ro ? "Ex: Diagramă cu un arbore binar" : "E.g. Binary tree diagram"}
              value={imageAlt}
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium" htmlFor="note-image-url">
            URL
            <div className="flex gap-2">
              <Input
                id="note-image-url"
                inputMode="url"
                onChange={(event) => setImageUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addImageFromUrl();
                  }
                }}
                placeholder="https://example.com/image.png"
                value={imageUrl}
              />
              <Button disabled={!imageUrl.trim()} onClick={addImageFromUrl} type="button">
                {ro ? "Adaugă" : "Add"}
              </Button>
            </div>
          </label>

          <div className="flex items-center gap-3 py-1 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            {ro ? "sau" : "or"}
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            disabled={uploadingImage}
            onClick={() => fileInputRef.current?.click()}
            type="button"
            variant="outline"
          >
            {uploadingImage ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {uploadingImage
              ? ro ? "Se încarcă..." : "Uploading..."
              : ro ? "Încarcă de pe dispozitiv" : "Upload from device"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            PNG, JPEG, WebP sau GIF · max. 8 MB
          </p>
        </div>

        <DialogFooter>
          <Button
            disabled={uploadingImage}
            onClick={() => {
              setImageDialogOpen(false);
              resetImageDialog();
            }}
            type="button"
            variant="ghost"
          >
            {ro ? "Anulează" : "Cancel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function FloatingToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Bold;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="flex size-8 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:ring-2 focus-visible:ring-primary/50 motion-safe:transition-colors"
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon className="size-4" />
    </button>
  );
}

function ExportMenuItem({
  description,
  icon: Icon,
  label,
  onSelect,
}: {
  description: string;
  icon: typeof FileText;
  label: string;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem
      className="gap-3 rounded-lg px-2 py-2.5"
      onSelect={onSelect}
    >
      <span className="flex size-8 items-center justify-center rounded-md border border-border/70 bg-background">
        <Icon className="size-4 text-muted-foreground" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{description}</span>
      </span>
    </DropdownMenuItem>
  );
}

function NoteOutlinePanel({
  activeId,
  items,
  onClose,
  onSelect,
  ro,
}: {
  activeId: string | null;
  items: ReturnType<typeof buildNoteOutline>;
  onClose: () => void;
  onSelect: (item: ReturnType<typeof buildNoteOutline>[number]) => void;
  ro: boolean;
}) {
  const completed = items.filter((item) => item.kind === "task" && item.checked).length;
  const tasks = items.filter((item) => item.kind === "task").length;
  const progressLabel = ro
    ? `${completed} din ${tasks} checkpoints finalizate`
    : `${completed} of ${tasks} checkpoints completed`;
  return (
    <aside
      aria-labelledby="note-outline-title"
      className="absolute inset-y-3 right-3 z-20 flex w-[min(19rem,calc(100%-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/92 shadow-xl backdrop-blur-xl motion-safe:animate-in motion-safe:slide-in-from-right-4 motion-safe:fade-in xl:static xl:inset-auto xl:z-auto xl:my-3 xl:mr-3 xl:w-72 xl:shrink-0 xl:shadow-sm"
    >
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <ListChecks className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold" id="note-outline-title">
          {ro ? "Cuprins" : "Outline"}
        </h2>
        {tasks ? (
          <span
            aria-label={progressLabel}
            className="ml-auto text-xs text-muted-foreground"
            title={progressLabel}
          >
            {completed}/{tasks}
          </span>
        ) : null}
        <Button aria-label={ro ? "Închide cuprinsul" : "Close outline"} className="size-7" onClick={onClose} size="icon" variant="ghost">
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {items.length ? (
          <ol className="relative space-y-0.5 before:absolute before:bottom-2 before:left-[1.05rem] before:top-2 before:w-px before:bg-border">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  className={cn(
                    "group relative flex w-full items-center gap-2 rounded-lg py-2 pr-2 text-left text-xs text-muted-foreground outline-none transition-all hover:bg-accent/70 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/50",
                    item.depth > 1 ? "pl-8" : "pl-2",
                    activeId === item.id && "bg-accent text-foreground"
                  )}
                  onClick={() => onSelect(item)}
                  title={`${item.text} · ${ro ? "linia" : "line"} ${item.line}`}
                  type="button"
                >
                  <span className={cn("relative z-10 flex size-4 shrink-0 items-center justify-center rounded-full border bg-background transition-colors", item.checked && "border-primary bg-primary text-primary-foreground")}>
                    {item.kind === "task" && item.checked ? <Check className="size-2.5" /> : item.kind === "heading" ? <span className="size-1.5 rounded-full bg-current" /> : null}
                  </span>
                  <span className={cn("truncate", item.kind === "heading" && "font-medium text-foreground/90", item.checked && "line-through opacity-65")}>{item.text}</span>
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <div className="px-2 py-10 text-center text-xs leading-5 text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-3 size-5 opacity-60" />
            {ro ? "Adaugă titluri sau checklist-uri pentru a construi cuprinsul." : "Add headings or checklists to build your outline."}
          </div>
        )}
      </div>
    </aside>
  );
}

function getTextareaCaretPosition(textarea: HTMLTextAreaElement, index: number) {
  const computed = window.getComputedStyle(textarea);
  const mirror = document.createElement("div");
  const copiedProperties = [
    "borderBottomWidth",
    "borderLeftWidth",
    "borderRightWidth",
    "borderTopWidth",
    "boxSizing",
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "letterSpacing",
    "lineHeight",
    "paddingBottom",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "tabSize",
    "textAlign",
    "textIndent",
    "textTransform",
    "wordSpacing",
  ] as const;

  mirror.style.position = "fixed";
  mirror.style.left = "-10000px";
  mirror.style.top = "0";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  mirror.style.width = `${textarea.clientWidth}px`;
  for (const property of copiedProperties) {
    mirror.style.setProperty(
      property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
      computed[property]
    );
  }

  mirror.textContent = textarea.value.slice(0, index);
  const marker = document.createElement("span");
  marker.textContent = "\u200b";
  mirror.append(marker);
  document.body.append(mirror);
  const position = { left: marker.offsetLeft, top: marker.offsetTop };
  mirror.remove();
  return position;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("Could not read image."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

async function waitForExportImages(surface: HTMLElement, timeoutMs = 3_000) {
  const deadline = Date.now() + timeoutMs;
  while (surface.querySelector('[role="img"].animate-pulse') && Date.now() < deadline) {
    await new Promise<void>((resolve) => window.setTimeout(resolve, 60));
  }

  const images = Array.from(surface.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const finish = () => resolve();
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
        window.setTimeout(finish, Math.max(0, deadline - Date.now()));
      });
    })
  );

  return !surface.querySelector('[role="img"].animate-pulse') && images.every((image) => image.complete);
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[
        character
      ] || character
  );
}

function FileTextIcon() {
  return (
    <span className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
      <FileText className="size-5" />
    </span>
  );
}

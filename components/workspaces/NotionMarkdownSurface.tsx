"use client";

import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Image from "@tiptap/extension-image";
import { decodeHtmlEntities, type Editor } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { TableKit } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";
import { closeHistory } from "@tiptap/pm/history";
import { NodeSelection } from "@tiptap/pm/state";
import {
  EditorContent,
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  useEditorState,
  type NodeViewProps,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Braces,
  CheckSquare2,
  ChevronDown,
  Code2,
  Eye,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  RotateCcw,
  Columns3,
  Rows3,
  Scaling,
  Strikethrough,
  Table2,
  Trash2,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import {
  DEFAULT_NOTE_CODE_LANGUAGE,
  findNoteCodeLanguage,
  getNoteCodeLanguageLabel,
  noteCodeLanguages,
} from "@/lib/note-code-languages";
import { noteCodeLowlight } from "@/lib/note-code-highlight";
import {
  DEFAULT_NOTE_IMAGE_PRESENTATION,
  normalizeNoteImagePresentation,
  parseNoteImageTitle,
  serializeNoteImageMarkdown,
  serializeNoteImageTitle,
  type NoteImageAlignment,
} from "@/lib/note-image";
import {
  MarkdownNoteTable,
  MarkdownNoteTableCell,
  MarkdownNoteTableHeader,
} from "@/lib/note-table";
import { getWorkspaceImage, parseWorkspaceImageId } from "@/lib/workspace-assets";
import { cn } from "@/lib/utils";

type NotionMarkdownSurfaceProps = {
  content: string;
  editorRef?: React.MutableRefObject<import("@tiptap/core").Editor | null>;
  onChange: (markdown: string) => void;
  onActiveText?: (text: string) => void;
  onOpenImage: () => void;
  onTitleChange: (title: string) => void;
  placeholder: string;
  ro: boolean;
  title: string;
  userId?: string;
};

/**
 * Visual editor backed by Markdown. The parent remains the canonical source,
 * so unsupported Markdown is never rewritten until the user edits visually.
 */
export function NotionMarkdownSurface({
  content,
  editorRef,
  onChange,
  onActiveText,
  onOpenImage,
  onTitleChange,
  placeholder,
  ro,
  title,
  userId,
}: NotionMarkdownSurfaceProps) {
  const applyingExternalRef = useRef(false);
  const lastEmittedRef = useRef(content);
  const activeTextCallbackRef = useRef(onActiveText);
  const slashMenuId = useId();
  useEffect(() => {
    activeTextCallbackRef.current = onActiveText;
  }, [onActiveText]);
  const [slash, setSlash] = useState<{
    from: number;
    left: number;
    query: string;
    to: number;
    top: number;
  } | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("https://");
  const codeBlockExtension = useMemo(() => {
    const CodeBlockNodeView = (props: NodeViewProps) => (
      <WorkspaceCodeBlockNodeView {...props} ro={ro} />
    );
    return CodeBlockLowlight.extend({
      addNodeView() {
        return ReactNodeViewRenderer(CodeBlockNodeView);
      },
    }).configure({
      defaultLanguage: DEFAULT_NOTE_CODE_LANGUAGE,
      enableTabIndentation: true,
      lowlight: noteCodeLowlight,
      tabSize: 2,
    });
  }, [ro]);
  const imageExtension = useMemo(
    () => {
      const ImageNodeView = (props: NodeViewProps) => (
        <WorkspaceImageNodeView {...props} ro={ro} userId={userId} />
      );
      return (
        Image.extend({
          addAttributes() {
            return {
              ...this.parent?.(),
              align: {
                default: DEFAULT_NOTE_IMAGE_PRESENTATION.align,
                parseHTML: (element) =>
                  normalizeNoteImagePresentation({ align: element.dataset.align }).align,
                renderHTML: (attributes) => ({ "data-align": attributes.align }),
              },
              opacity: {
                default: DEFAULT_NOTE_IMAGE_PRESENTATION.opacity,
                parseHTML: (element) =>
                  normalizeNoteImagePresentation({ opacity: element.dataset.opacity }).opacity,
                renderHTML: (attributes) => ({ "data-opacity": attributes.opacity }),
              },
              widthPercent: {
                default: DEFAULT_NOTE_IMAGE_PRESENTATION.widthPercent,
                parseHTML: (element) =>
                  normalizeNoteImagePresentation({ widthPercent: element.dataset.width })
                    .widthPercent,
                renderHTML: (attributes) => ({ "data-width": attributes.widthPercent }),
              },
            };
          },
          parseMarkdown(token, helpers) {
            // Marked exposes escaped image attributes (`\\\\` and HTML
            // entities). Decode exactly once so save/reload is lossless.
            const alt = decodeHtmlEntities(String(token.text ?? "")).replace(/\\\\/g, "\\");
            const parsedTitle =
              token.title === null || token.title === undefined
                ? null
                : decodeHtmlEntities(String(token.title));
            const { ordinaryTitle, presentation } = parseNoteImageTitle(parsedTitle);
            return helpers.createNode("image", {
              alt,
              src: token.href,
              title: ordinaryTitle,
              ...presentation,
            });
          },
          renderMarkdown(node) {
            const src = String(node.attrs?.src ?? "");
            const alt = String(node.attrs?.alt ?? "");
            const title = serializeNoteImageTitle({
              align: node.attrs?.align,
              opacity: node.attrs?.opacity,
              ordinaryTitle:
                typeof node.attrs?.title === "string" ? node.attrs.title : null,
              widthPercent: node.attrs?.widthPercent,
            });
            return serializeNoteImageMarkdown({ alt, src, title });
          },
          addNodeView() {
            return ReactNodeViewRenderer(ImageNodeView);
          },
        }).configure({
          allowBase64: false,
          HTMLAttributes: {
            class:
              "my-7 max-w-full rounded-xl border border-border/70 bg-muted/20 object-contain",
            loading: "lazy",
            referrerpolicy: "no-referrer",
          },
        })
      );
    },
    [ro, userId]
  );
  const editor = useEditor({
    immediatelyRender: false,
    content,
    contentType: "markdown",
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
        link: {
          autolink: true,
          defaultProtocol: "https",
          openOnClick: false,
        },
      }),
      codeBlockExtension,
      imageExtension,
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({
        table: false,
        tableCell: false,
        tableHeader: false,
      }),
      MarkdownNoteTable.configure({
        allowTableNodeSelection: true,
        renderWrapper: true,
        resizable: false,
      }),
      MarkdownNoteTableCell,
      MarkdownNoteTableHeader,
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
      }),
      Markdown.configure({
        indentation: { style: "space", size: 2 },
        markedOptions: { gfm: true },
      }),
    ],
    editorProps: {
      attributes: {
        "aria-label": placeholder,
        class:
          "notion-note-prose min-h-[calc(100vh-17rem)] outline-none selection:bg-primary/20",
        spellcheck: "true",
      },
      handleKeyDown(view, event) {
        return event.key === "Enter" && selectionIsInsideTable(view.state.selection.$from);
      },
      handlePaste(view, event) {
        if (!selectionIsInsideTable(view.state.selection.$from)) return false;
        const plainText = event.clipboardData?.getData("text/plain");
        if (!plainText || !/[\r\n]/.test(plainText)) return false;
        view.dispatch(view.state.tr.insertText(plainText.replace(/\s+/g, " ").trim()));
        return true;
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (applyingExternalRef.current) return;
      const markdown = currentEditor.markdown?.serialize(currentEditor.getJSON()) ?? currentEditor.getMarkdown();
      lastEmittedRef.current = markdown;
      onChange(markdown);
      syncVisualSlash(currentEditor, setSlash, setSlashIndex);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      syncVisualSlash(currentEditor, setSlash, setSlashIndex);
      activeTextCallbackRef.current?.(currentEditor.state.selection.$from.parent.textContent.trim());
    },
  }, [codeBlockExtension, imageExtension]);
  const tableActive =
    useEditorState({
      editor,
      selector: ({ editor: current }) => current?.isActive("table") ?? false,
    }) ?? false;
  const tableInsertionBlocked =
    useEditorState({
      editor,
      selector: ({ editor: current }) =>
        current
          ? current.isActive("table") ||
            current.isActive("bulletList") ||
            current.isActive("orderedList") ||
            current.isActive("taskList")
          : false,
    }) ?? false;

  useEffect(() => {
    if (!editor || content === lastEmittedRef.current) return;
    applyingExternalRef.current = true;
    editor.commands.setContent(content, {
      contentType: "markdown",
      emitUpdate: false,
    });
    lastEmittedRef.current = content;
    applyingExternalRef.current = false;
  }, [content, editor]);

  useEffect(() => {
    if (!editorRef) return;
    editorRef.current = editor;
    return () => {
      editorRef.current = null;
    };
  }, [editor, editorRef]);

  const visualCommands = useMemo(
    () => [
      {
        id: "text",
        icon: Pilcrow,
        label: "Text",
        run: (current: Editor) => current.chain().focus().setParagraph().run(),
      },
      {
        id: "heading-1",
        icon: Heading1,
        label: ro ? "Titlu 1" : "Heading 1",
        run: (current: Editor) => current.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        id: "heading-2",
        icon: Heading2,
        label: ro ? "Titlu 2" : "Heading 2",
        run: (current: Editor) => current.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        id: "bullet-list",
        icon: List,
        label: ro ? "Listă" : "Bullet list",
        run: (current: Editor) => current.chain().focus().toggleBulletList().run(),
      },
      {
        id: "checklist",
        icon: CheckSquare2,
        label: ro ? "Listă de sarcini" : "Checklist",
        run: (current: Editor) => current.chain().focus().toggleTaskList().run(),
      },
      {
        id: "quote",
        icon: Quote,
        label: ro ? "Citat" : "Quote",
        run: (current: Editor) => current.chain().focus().toggleBlockquote().run(),
      },
      {
        id: "code-block",
        icon: Code2,
        label: ro ? "Bloc de cod" : "Code block",
        run: (current: Editor) => current.chain().focus().toggleCodeBlock().run(),
      },
      {
        id: "table",
        icon: Table2,
        label: ro ? "Tabel" : "Table",
        run: (current: Editor) =>
          tableInsertionIsBlocked(current)
            ? false
            : current.chain().focus().insertTable({ cols: 3, rows: 3, withHeaderRow: true }).run(),
      },
      {
        id: "image",
        icon: ImagePlus,
        label: ro ? "Imagine · URL sau încărcare" : "Image · URL or upload",
        run: () => {
          onOpenImage();
          return true;
        },
      },
    ],
    [onOpenImage, ro]
  );
  const filteredVisualCommands = useMemo(() => {
    const query = slash?.query.toLocaleLowerCase() || "";
    return visualCommands.filter((command) =>
      `${command.id} ${command.label}`.toLocaleLowerCase().includes(query)
    );
  }, [slash?.query, visualCommands]);
  const visualSlashOpen = Boolean(slash && filteredVisualCommands.length);
  const activeSlashOptionId = visualSlashOpen
    ? `${slashMenuId}-${filteredVisualCommands[slashIndex]?.id ?? filteredVisualCommands[0]?.id}`
    : undefined;

  useEffect(() => {
    if (!editor) return;
    const editorElement = editor.view.dom;
    editorElement.setAttribute("aria-autocomplete", "list");
    editorElement.setAttribute("aria-expanded", String(visualSlashOpen));
    editorElement.setAttribute("aria-haspopup", "listbox");

    if (visualSlashOpen) {
      editorElement.setAttribute("aria-controls", slashMenuId);
      if (activeSlashOptionId) {
        editorElement.setAttribute("aria-activedescendant", activeSlashOptionId);
      }
    } else {
      editorElement.removeAttribute("aria-controls");
      editorElement.removeAttribute("aria-activedescendant");
    }

    return () => {
      editorElement.removeAttribute("aria-autocomplete");
      editorElement.removeAttribute("aria-controls");
      editorElement.removeAttribute("aria-expanded");
      editorElement.removeAttribute("aria-haspopup");
      editorElement.removeAttribute("aria-activedescendant");
    };
  }, [activeSlashOptionId, editor, slashMenuId, visualSlashOpen]);

  const applyVisualSlashCommand = (index: number) => {
    if (!editor || !slash) return;
    const command = filteredVisualCommands[index] || filteredVisualCommands[0];
    if (!command) return;
    editor.chain().focus().deleteRange({ from: slash.from, to: slash.to }).run();
    command.run(editor);
    setSlash(null);
    setSlashIndex(0);
  };

  useEffect(() => {
    if (!editor || !slash) return;
    const element = editor.view.dom;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        const direction = event.key === "ArrowDown" ? 1 : -1;
        setSlashIndex((current) =>
          filteredVisualCommands.length
            ? (current + direction + filteredVisualCommands.length) % filteredVisualCommands.length
            : 0
        );
      } else if (event.key === "Enter" && filteredVisualCommands.length) {
        event.preventDefault();
        event.stopPropagation();
        applyVisualSlashCommand(slashIndex);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setSlash(null);
      }
    };
    element.addEventListener("keydown", onKeyDown, true);
    return () => element.removeEventListener("keydown", onKeyDown, true);
  });

  if (!editor) {
    return <div className="mx-auto h-64 w-full max-w-3xl animate-pulse rounded-xl bg-muted/25" />;
  }

  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    setLinkValue(previous || "https://");
    setLinkDialogOpen(true);
  };

  const confirmLink = (value: string) => {
    const href = value.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkDialogOpen(false);
  };

  return (
    <div className="relative mx-auto w-full max-w-[860px] px-6 pb-36 pt-12 sm:px-10 lg:pt-16">
      <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-px w-5 bg-border" />
        {title || (ro ? "Fără titlu" : "Untitled")}
      </div>
      <input
        aria-label={ro ? "Titlul paginii" : "Page title"}
        className="mb-9 w-full bg-transparent text-4xl font-bold tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40 sm:text-5xl"
        maxLength={100}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder={ro ? "Fără titlu" : "Untitled"}
        value={title}
      />

      <BubbleMenu
        editor={editor}
        className="sx-elevated flex items-center gap-0.5 rounded-xl border border-border/70 bg-popover/95 p-1 backdrop-blur-xl"
        pluginKey="noteTextBubbleMenu"
        shouldShow={({ editor: current }) => {
          const selection = current.state.selection;
          return (
            !selection.empty &&
            !(selection instanceof NodeSelection && selection.node.type.name === "image")
          );
        }}
      >
        <RichButton
          active={editor.isActive("bold")}
          label={ro ? "Aldin" : "Bold"}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold />
        </RichButton>
        <RichButton
          active={editor.isActive("italic")}
          label={ro ? "Cursiv" : "Italic"}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic />
        </RichButton>
        <RichButton
          active={editor.isActive("strike")}
          label={ro ? "Tăiat" : "Strike"}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough />
        </RichButton>
        <RichButton active={editor.isActive("link")} label={ro ? "Legătură" : "Link"} onClick={setLink}>
          <Link2 />
        </RichButton>
        <RichButton
          active={editor.isActive("code")}
          label={ro ? "Cod în linie" : "Inline code"}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code2 />
        </RichButton>
      </BubbleMenu>

      <ImageBubbleMenu editor={editor} ro={ro} />

      <TableBubbleMenu editor={editor} ro={ro} />

      <div className="sticky top-3 z-10 mb-6 flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-border/60 bg-background/88 p-1 shadow-sm backdrop-blur-xl">
        <RichButton
          active={editor.isActive("heading", { level: 1 })}
          disabled={tableActive}
          label={ro ? "Titlu 1" : "Heading 1"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 />
        </RichButton>
        <RichButton
          active={editor.isActive("heading", { level: 2 })}
          disabled={tableActive}
          label={ro ? "Titlu 2" : "Heading 2"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 />
        </RichButton>
        <RichButton
          active={editor.isActive("bulletList")}
          disabled={tableActive}
          label={ro ? "Listă" : "Bullet list"}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </RichButton>
        <RichButton
          active={editor.isActive("orderedList")}
          disabled={tableActive}
          label={ro ? "Listă numerotată" : "Ordered list"}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </RichButton>
        <RichButton
          active={editor.isActive("taskList")}
          disabled={tableActive}
          label={ro ? "Listă de sarcini" : "Checklist"}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <CheckSquare2 />
        </RichButton>
        <RichButton
          active={editor.isActive("blockquote")}
          disabled={tableActive}
          label={ro ? "Citat" : "Quote"}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote />
        </RichButton>
        <RichButton
          active={editor.isActive("table")}
          disabled={tableInsertionBlocked}
          label={ro ? "Inserează tabel" : "Insert table"}
          onClick={() => {
            if (!tableInsertionIsBlocked(editor)) {
              editor.chain().focus().insertTable({ cols: 3, rows: 3, withHeaderRow: true }).run();
            }
          }}
        >
          <Table2 />
        </RichButton>
        <RichButton active={false} disabled={tableActive} label={ro ? "Adaugă imagine" : "Add image"} onClick={onOpenImage}>
          <ImagePlus />
        </RichButton>
      </div>

      <EditorContent editor={editor} />

      {slash && filteredVisualCommands.length ? (
        <div
          aria-label={ro ? "Inserează bloc" : "Insert block"}
          className="sx-elevated fixed z-50 max-h-80 w-72 overflow-y-auto rounded-xl border border-border/70 bg-popover/95 p-1.5 text-popover-foreground backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
          id={slashMenuId}
          role="listbox"
          style={{
            left: Math.min(slash.left, window.innerWidth - 304),
            top: Math.min(slash.top, window.innerHeight - 340),
          }}
        >
          <p className="px-2 py-1.5 text-xs font-medium tracking-normal text-muted-foreground">{ro ? "Blocuri" : "Blocks"}</p>
          {filteredVisualCommands.map((command, index) => {
            const Icon = command.icon;
            return (
              <button
                id={`${slashMenuId}-${command.id}`}
                aria-selected={slashIndex === index}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm outline-none transition-colors",
                  slashIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-accent/70"
                )}
                key={command.id}
                onClick={() => applyVisualSlashCommand(index)}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setSlashIndex(index)}
                role="option"
                type="button"
              >
                <span className="flex size-8 items-center justify-center rounded-md border border-border/70 bg-background/75">
                  <Icon className="size-4" />
                </span>
                <span className="font-medium">{command.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <PromptDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        title={ro ? "Adaugă o legătură" : "Add link"}
        description={ro ? "Introdu adresa către care va trimite textul selectat." : "Enter the destination for the selected text."}
        label="URL"
        value={linkValue}
        onValueChange={setLinkValue}
        onConfirm={confirmLink}
        placeholder="https://"
        cancelLabel={ro ? "Anulează" : "Cancel"}
        confirmLabel={ro ? "Aplică" : "Apply"}
      />
    </div>
  );
}

function TableBubbleMenu({ editor, ro }: { editor: Editor; ro: boolean }) {
  return (
    <BubbleMenu
      editor={editor}
      className="sx-elevated flex items-center gap-0.5 rounded-xl border border-border/70 bg-popover/95 p-1 backdrop-blur-xl"
      pluginKey="noteTableBubbleMenu"
      shouldShow={({ editor: current }) =>
        current.isActive("table") && current.state.selection.empty
      }
    >
      <div aria-label={ro ? "Opțiuni tabel" : "Table options"} className="flex items-center gap-0.5" role="toolbar">
        <RichButton
          active={false}
          label={ro ? "Adaugă rând dedesubt" : "Add row below"}
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          <Rows3 />
        </RichButton>
        <RichButton
          active={false}
          label={ro ? "Adaugă coloană la dreapta" : "Add column right"}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          <Columns3 />
        </RichButton>
        <span aria-hidden="true" className="mx-0.5 h-5 w-px bg-border" />
        <RichButton
          active={false}
          label={ro ? "Șterge rândul" : "Delete row"}
          onClick={() => editor.chain().focus().deleteRow().run()}
        >
          <Rows3 />
        </RichButton>
        <RichButton
          active={false}
          label={ro ? "Șterge coloana" : "Delete column"}
          onClick={() => editor.chain().focus().deleteColumn().run()}
        >
          <Columns3 />
        </RichButton>
        <RichButton
          active={false}
          label={ro ? "Șterge tabelul" : "Delete table"}
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          <Trash2 />
        </RichButton>
      </div>
    </BubbleMenu>
  );
}

function syncVisualSlash(
  editor: Editor,
  setSlash: React.Dispatch<
    React.SetStateAction<{ from: number; left: number; query: string; to: number; top: number } | null>
  >,
  setIndex: React.Dispatch<React.SetStateAction<number>>
) {
  if (editor.isActive("table")) {
    setSlash(null);
    setIndex(0);
    return;
  }
  const { $from } = editor.state.selection;
  if (!$from.parent.isTextblock) {
    setSlash(null);
    return;
  }
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
  const match = textBefore.match(/^\/([\p{L}\p{N}-]*)$/u);
  if (!match) {
    setSlash(null);
    return;
  }
  const coords = editor.view.coordsAtPos(editor.state.selection.from);
  setIndex(0);
  setSlash({
    from: editor.state.selection.from - textBefore.length,
    left: Math.max(8, coords.left),
    query: match[1],
    to: editor.state.selection.from,
    top: coords.bottom + 8,
  });
}

function WorkspaceCodeBlockNodeView({
  editor,
  node,
  ro,
  updateAttributes,
}: NodeViewProps & { ro: boolean }) {
  const [open, setOpen] = useState(false);
  const selectedLanguage = findNoteCodeLanguage(node.attrs.language);
  const languageLabel = getNoteCodeLanguageLabel(node.attrs.language);

  const selectLanguage = (languageId: string) => {
    updateAttributes({
      language:
        languageId === DEFAULT_NOTE_CODE_LANGUAGE ? null : languageId,
    });
    setOpen(false);
    window.requestAnimationFrame(() => editor.commands.focus());
  };

  return (
    <NodeViewWrapper
      className="group/notecode relative my-6 overflow-hidden rounded-xl border border-border/75 bg-muted/45 transition-colors focus-within:border-border"
      data-language={String(node.attrs.language || DEFAULT_NOTE_CODE_LANGUAGE)}
      data-note-code-block
    >
      <div
        className="absolute right-2 top-2 z-10 flex items-center rounded-lg border border-border/60 bg-background/92 p-0.5 text-foreground opacity-100 shadow-sm backdrop-blur-md transition-opacity sm:opacity-0 sm:group-focus-within/notecode:opacity-100 sm:group-hover/notecode:opacity-100"
        contentEditable={false}
      >
        <Popover modal={false} onOpenChange={setOpen} open={open}>
          <PopoverTrigger asChild>
            <Button
              aria-label={
                ro
                  ? `Limbajul blocului de cod: ${languageLabel}`
                  : `Code block language: ${languageLabel}`
              }
              className="h-7 max-w-44 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              size="sm"
              type="button"
              variant="ghost"
            >
              <Braces className="size-3.5 shrink-0" />
              <span className="truncate">{languageLabel}</span>
              <ChevronDown className="size-3 shrink-0 opacity-60" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-[min(20rem,calc(100vw-1rem))] gap-0 overflow-hidden p-0"
            sideOffset={6}
          >
            <Command>
              <CommandInput
                autoFocus
                placeholder={
                  ro ? "Caută un limbaj…" : "Search for a language…"
                }
              />
              <CommandList className="note-scrollbar max-h-72">
                <CommandEmpty>
                  {ro ? "Niciun limbaj găsit." : "No language found."}
                </CommandEmpty>
                <CommandGroup
                  heading={ro ? "Limbaje de programare" : "Programming languages"}
                >
                  {noteCodeLanguages.map((language) => (
                    <CommandItem
                      data-checked={selectedLanguage?.id === language.id}
                      key={language.id}
                      onSelect={() => selectLanguage(language.id)}
                      value={`${language.label} ${language.id} ${
                        language.aliases?.join(" ") || ""
                      }`}
                    >
                      <span className="truncate">{language.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {!node.textContent ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-5 top-11 select-none font-mono text-[13px] leading-6 text-muted-foreground/55 sm:text-sm"
          contentEditable={false}
        >
          {ro ? "Scrie cod…" : "Write code…"}
        </span>
      ) : null}

      <NodeViewContent<"code">
        as="code"
        className="note-scrollbar block min-h-20 overflow-x-auto whitespace-pre px-5 pb-3 pt-11 font-mono text-[13px] leading-6 text-foreground outline-none sm:text-sm"
        data-note-code-content
        spellCheck={false}
      />
    </NodeViewWrapper>
  );
}

type ResizeCorner = "bottom-left" | "bottom-right" | "top-left" | "top-right";
const NOTE_IMAGE_PREVIEW_EVENT = "scripticx:note-image-preview";

type ImageControlPreview = {
  opacity?: number;
  widthPercent?: number;
};

type ImageResizeSession = {
  corner: ResizeCorner;
  parentWidth: number;
  pointerId: number;
  startClientX: number;
  startRenderedWidth: number;
  width: number;
};

function WorkspaceImageNodeView({
  editor,
  getPos,
  node,
  ro,
  selected,
  userId,
}: NodeViewProps & { ro: boolean; userId?: string }) {
  const source = String(node.attrs.src || "");
  const assetId = parseWorkspaceImageId(source);
  const presentation = normalizeNoteImagePresentation(node.attrs);
  const [resolvedSource, setResolvedSource] = useState(assetId ? "" : source);
  const [failed, setFailed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragWidth, setDragWidth] = useState<number | undefined>();
  const [controlPreview, setControlPreview] = useState<ImageControlPreview | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const resizeSessionRef = useRef<ImageResizeSession | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const renderedWidth =
    dragWidth === undefined
      ? controlPreview?.widthPercent ?? presentation.widthPercent
      : dragWidth;
  const renderedOpacity = controlPreview?.opacity ?? presentation.opacity;

  useEffect(() => {
    const frame = wrapperRef.current;
    if (!frame) return;
    const onPreview = (event: Event) => {
      const detail = (event as CustomEvent<ImageControlPreview | null>).detail;
      setControlPreview(detail ? (current) => ({ ...current, ...detail }) : null);
    };
    frame.addEventListener(NOTE_IMAGE_PREVIEW_EVENT, onPreview);
    return () => frame.removeEventListener(NOTE_IMAGE_PREVIEW_EVENT, onPreview);
  }, []);

  useEffect(() => {
    setControlPreview(null);
  }, [presentation.align, presentation.opacity, presentation.widthPercent, selected]);

  useEffect(() => {
    setFailed(false);
    if (!assetId || !userId) {
      setResolvedSource(source);
      return;
    }
    setResolvedSource("");
    let active = true;
    let objectUrl = "";
    void getWorkspaceImage(userId, assetId)
      .then((blob) => {
        if (!active || !blob) {
          if (active) setFailed(true);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setResolvedSource(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId, source, userId]);

  const beginResize = (event: React.PointerEvent<HTMLSpanElement>, corner: ResizeCorner) => {
    const wrapper = wrapperRef.current;
    if (!wrapper || resizeSessionRef.current) return;
    const parentWidth = wrapper.parentElement?.getBoundingClientRect().width || 0;
    if (parentWidth <= 0) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const frame = wrapper.getBoundingClientRect();
    const startRenderedWidth =
      normalizeNoteImagePresentation({
        widthPercent: (frame.width / parentWidth) * 100,
      }).widthPercent ?? 100;
    resizeSessionRef.current = {
      corner,
      parentWidth,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startRenderedWidth,
      width: startRenderedWidth,
    };
    setDragWidth(startRenderedWidth);
    setIsResizing(true);
  };

  const previewResize = (event: React.PointerEvent<HTMLSpanElement>) => {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();

    const horizontalDirection = session.corner.endsWith("left") ? -1 : 1;
    const anchorFactor = presentation.align === "center" ? 2 : 1;
    const pixelDelta =
      (event.clientX - session.startClientX) * horizontalDirection * anchorFactor;
    const startPixels = (session.startRenderedWidth / 100) * session.parentWidth;
    const width = normalizeNoteImagePresentation({
      widthPercent: ((startPixels + pixelDelta) / session.parentWidth) * 100,
    }).widthPercent ?? session.startRenderedWidth;
    session.width = width;
    setDragWidth(width);
  };

  const commitResize = (event: React.PointerEvent<HTMLSpanElement>) => {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    resizeSessionRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsResizing(false);
    const widthPercent = Number(session.width.toFixed(2));
    if (Math.abs(widthPercent - session.startRenderedWidth) >= 0.01) {
      // A complete pointer drag deliberately creates one undoable document transaction.
      commitImageNodeAttributes(editor, getPos, node, { widthPercent });
    }
    window.requestAnimationFrame(() => setDragWidth(undefined));
  };

  const cancelResize = (event: React.PointerEvent<HTMLSpanElement>) => {
    const session = resizeSessionRef.current;
    if (!session || session.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    resizeSessionRef.current = null;
    setIsResizing(false);
    setDragWidth(undefined);
  };

  const resizeCorners: ResizeCorner[] =
    presentation.align === "left"
      ? ["top-right", "bottom-right"]
      : presentation.align === "right"
        ? ["top-left", "bottom-left"]
        : ["top-left", "top-right", "bottom-left", "bottom-right"];

  return (
    <NodeViewWrapper
      className={cn(
        "my-7 flex w-full",
        presentation.align === "left" && "justify-start",
        presentation.align === "center" && "justify-center",
        presentation.align === "right" && "justify-end"
      )}
      contentEditable={false}
    >
      <div
        className={cn(
          "relative max-w-full ease-out",
          renderedWidth !== null && "min-w-[20%]",
          "transition-opacity duration-150",
          selected && "rounded-xl ring-2 ring-primary/55 ring-offset-2 ring-offset-background"
        )}
        data-drag-handle
        data-note-image-frame
        ref={wrapperRef}
        style={{ width: renderedWidth === null ? "fit-content" : `${renderedWidth}%` }}
      >
        {resolvedSource && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element -- may be an IndexedDB object URL.
          <img
            alt={String(node.attrs.alt || "")}
            className="block h-auto max-w-full rounded-xl border border-border/70 bg-muted/20 object-contain shadow-sm"
            decoding="async"
            draggable={false}
            ref={imageRef}
            referrerPolicy="no-referrer"
            src={resolvedSource}
            style={{
              opacity: renderedOpacity / 100,
              width: renderedWidth === null ? "auto" : "100%",
            }}
            title={typeof node.attrs.title === "string" ? node.attrs.title : undefined}
          />
        ) : (
          <div
            className="flex min-h-32 min-w-40 items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-sm text-muted-foreground"
            style={{ opacity: renderedOpacity / 100 }}
          >
            {failed
              ? String(node.attrs.alt || (ro ? "Imagine indisponibilă" : "Image unavailable"))
              : ro ? "Se încarcă imaginea…" : "Loading image…"}
          </div>
        )}
        {selected
          ? resizeCorners.map(
              (corner) => (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute z-10 size-3 touch-none rounded-[3px] border-2 border-background bg-primary shadow-sm after:absolute after:-inset-2 after:content-['']",
                    corner === "top-left" && "-left-1.5 -top-1.5 cursor-nwse-resize",
                    corner === "top-right" && "-right-1.5 -top-1.5 cursor-nesw-resize",
                    corner === "bottom-left" && "-bottom-1.5 -left-1.5 cursor-nesw-resize",
                    corner === "bottom-right" && "-bottom-1.5 -right-1.5 cursor-nwse-resize"
                  )}
                  key={corner}
                  onPointerCancel={cancelResize}
                  onPointerDown={(event) => beginResize(event, corner)}
                  onLostPointerCapture={cancelResize}
                  onPointerMove={previewResize}
                  onPointerUp={commitResize}
                />
              )
            )
          : null}
        {selected && isResizing ? (
          <span className="pointer-events-none absolute bottom-2 right-2 rounded-md bg-foreground/85 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-background shadow-sm">
            {Math.round(renderedWidth ?? 100)}%
          </span>
        ) : null}
      </div>
    </NodeViewWrapper>
  );
}

function ImageBubbleMenu({ editor, ro }: { editor: Editor; ro: boolean }) {
  const presentation = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      normalizeNoteImagePresentation(current.getAttributes("image")),
  });
  const selectedImageKey = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const selection = current.state.selection;
      return selection instanceof NodeSelection && selection.node.type.name === "image"
        ? `${selection.from}:${String(selection.node.attrs.src || "")}`
        : "none";
    },
  });
  const updatePresentation = (attributes: {
    align?: NoteImageAlignment;
    opacity?: number;
    widthPercent?: number | null;
  }) => {
    commitSelectedImageAttributes(editor, attributes);
  };
  const displayedWidth = presentation.widthPercent ?? 100;

  return (
    <BubbleMenu
      editor={editor}
      className="sx-elevated max-w-[calc(100vw-1rem)] overflow-x-auto rounded-xl border border-border/70 bg-popover/95 p-1.5 text-popover-foreground backdrop-blur-xl"
      getReferencedVirtualElement={() => {
        const selection = editor.state.selection;
        if (!(selection instanceof NodeSelection) || selection.node.type.name !== "image") {
          return null;
        }
        const nodeDom = editor.view.nodeDOM(selection.from);
        if (!(nodeDom instanceof HTMLElement)) return null;
        return nodeDom.querySelector<HTMLElement>("[data-note-image-frame]") || nodeDom;
      }}
      pluginKey="noteImageBubbleMenu"
      shouldShow={({ editor: current }) => {
        const selection = current.state.selection;
        return selection instanceof NodeSelection && selection.node.type.name === "image";
      }}
    >
      <div
        aria-label={ro ? "Opțiuni imagine" : "Image options"}
        className="flex min-w-max items-center gap-1"
        role="toolbar"
      >
        <div className="flex items-center gap-0.5 border-r border-border/70 pr-1">
          <RichButton
            active={presentation.align === "left"}
            label={ro ? "Aliniază imaginea la stânga" : "Align image left"}
            onClick={() => updatePresentation({ align: "left" })}
          >
            <AlignLeft />
          </RichButton>
          <RichButton
            active={presentation.align === "center"}
            label={ro ? "Centrează imaginea" : "Center image"}
            onClick={() => updatePresentation({ align: "center" })}
          >
            <AlignCenter />
          </RichButton>
          <RichButton
            active={presentation.align === "right"}
            label={ro ? "Aliniază imaginea la dreapta" : "Align image right"}
            onClick={() => updatePresentation({ align: "right" })}
          >
            <AlignRight />
          </RichButton>
        </div>

        <ImageControlSlider
          icon={Scaling}
          key={`${selectedImageKey}:width:${presentation.widthPercent ?? "auto"}`}
          label={ro ? "Lățimea imaginii" : "Image width"}
          min={20}
          onCancel={() => clearSelectedImagePreview(editor)}
          onPreview={(value) => previewSelectedImageAttributes(editor, { widthPercent: value })}
          onValueCommit={(value) => updatePresentation({ widthPercent: value })}
          value={displayedWidth}
        />
        <ImageControlSlider
          icon={Eye}
          key={`${selectedImageKey}:opacity:${presentation.opacity}`}
          label={ro ? "Opacitatea imaginii" : "Image opacity"}
          min={10}
          onCancel={() => clearSelectedImagePreview(editor)}
          onPreview={(value) => previewSelectedImageAttributes(editor, { opacity: value })}
          onValueCommit={(value) => updatePresentation({ opacity: value })}
          value={presentation.opacity}
        />
        <Button
          aria-label={ro ? "Resetează aspectul imaginii" : "Reset image appearance"}
          className="ml-0.5 size-8 shrink-0"
          onClick={() => updatePresentation(DEFAULT_NOTE_IMAGE_PRESENTATION)}
          size="icon"
          title={ro ? "Resetează" : "Reset"}
          type="button"
          variant="ghost"
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </BubbleMenu>
  );
}

function commitSelectedImageAttributes(
  editor: Editor,
  attributes: {
    align?: NoteImageAlignment;
    opacity?: number;
    widthPercent?: number | null;
  }
) {
  const selection = editor.state.selection;
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== "image") return;
  clearSelectedImagePreview(editor);
  if (
    Object.entries(attributes).every(
      ([key, value]) => Object.is(selection.node.attrs[key], value)
    )
  ) {
    return;
  }
  const transaction = closeHistory(
    editor.state.tr.setNodeMarkup(selection.from, undefined, {
      ...selection.node.attrs,
      ...attributes,
    })
  );
  editor.view.dispatch(transaction);
  closeImageHistoryEvent(editor);
}

function commitImageNodeAttributes(
  editor: Editor,
  getPos: NodeViewProps["getPos"],
  originalNode: NodeViewProps["node"],
  attributes: { widthPercent: number }
) {
  const position = getPos();
  if (typeof position !== "number") return;
  const currentNode = editor.state.doc.nodeAt(position);
  if (
    !currentNode ||
    currentNode.type.name !== "image" ||
    currentNode.attrs.src !== originalNode.attrs.src
  ) {
    return;
  }
  if (
    Object.entries(attributes).every(
      ([key, value]) => Object.is(currentNode.attrs[key], value)
    )
  ) {
    return;
  }
  const transaction = closeHistory(
    editor.state.tr.setNodeMarkup(position, undefined, {
      ...currentNode.attrs,
      ...attributes,
    })
  );
  editor.view.dispatch(transaction);
  closeImageHistoryEvent(editor);
}

function closeImageHistoryEvent(editor: Editor) {
  editor.view.dispatch(closeHistory(editor.state.tr).setMeta("addToHistory", false));
}

function previewSelectedImageAttributes(
  editor: Editor,
  attributes: { opacity?: number; widthPercent?: number }
) {
  const selection = editor.state.selection;
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== "image") return;
  const nodeDom = editor.view.nodeDOM(selection.from);
  if (!(nodeDom instanceof HTMLElement)) return;
  const frame = nodeDom.querySelector<HTMLElement>("[data-note-image-frame]");
  if (!frame) return;
  frame.dispatchEvent(new CustomEvent(NOTE_IMAGE_PREVIEW_EVENT, { detail: attributes }));
}

function clearSelectedImagePreview(editor: Editor) {
  const selection = editor.state.selection;
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== "image") return;
  const nodeDom = editor.view.nodeDOM(selection.from);
  if (!(nodeDom instanceof HTMLElement)) return;
  nodeDom
    .querySelector<HTMLElement>("[data-note-image-frame]")
    ?.dispatchEvent(new CustomEvent(NOTE_IMAGE_PREVIEW_EVENT, { detail: null }));
}

function ImageControlSlider({
  icon: Icon,
  label,
  min,
  onCancel,
  onPreview,
  onValueCommit,
  value,
}: {
  icon: typeof Scaling;
  label: string;
  min: number;
  onCancel: () => void;
  onPreview: (value: number) => void;
  onValueCommit: (value: number) => void;
  value: number;
}) {
  const [draft, setDraft] = useState<number | null>(null);
  const draftRef = useRef<number | null>(null);
  const displayedValue = draft ?? value;

  const cancelDraft = () => {
    draftRef.current = null;
    setDraft(null);
    onCancel();
  };

  return (
    <div className="flex items-center gap-2 rounded-lg px-1.5 py-1" title={label}>
      <Icon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
      <Slider
        aria-label={label}
        className="w-20 sm:w-24"
        max={100}
        min={min}
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          cancelDraft();
        }}
        onLostPointerCapture={() => {
          window.queueMicrotask(() => {
            if (draftRef.current !== null) cancelDraft();
          });
        }}
        onPointerCancel={cancelDraft}
        onValueChange={(values) => {
          const next = values[0] ?? displayedValue;
          draftRef.current = next;
          setDraft(next);
          onPreview(next);
        }}
        onValueCommit={(values) => {
          const next = values[0] ?? displayedValue;
          draftRef.current = null;
          onValueCommit(next);
          setDraft(null);
        }}
        step={1}
        value={[displayedValue]}
      />
      <output
        aria-label={`${label}: ${Math.round(displayedValue)}%`}
        className="w-9 text-right text-[11px] font-medium tabular-nums text-muted-foreground"
      >
        {Math.round(displayedValue)}%
      </output>
    </div>
  );
}

function RichButton({
  active,
  children,
  disabled = false,
  label,
  onClick,
}: {
  active: boolean;
  children: React.ReactElement;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      aria-pressed={active}
      className={cn("size-8 shrink-0", active && "bg-accent text-accent-foreground")}
      disabled={disabled}
      onClick={onClick}
      size="icon"
      title={label}
      type="button"
      variant="ghost"
    >
      {children}
    </Button>
  );
}

function selectionIsInsideTable(position: import("@tiptap/pm/model").ResolvedPos) {
  for (let depth = position.depth; depth >= 0; depth -= 1) {
    const name = position.node(depth).type.name;
    if (name === "tableCell" || name === "tableHeader") return true;
  }
  return false;
}

function tableInsertionIsBlocked(editor: Editor) {
  return (
    editor.isActive("table") ||
    editor.isActive("bulletList") ||
    editor.isActive("orderedList") ||
    editor.isActive("taskList")
  );
}

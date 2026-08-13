"use client";

import Image from "@tiptap/extension-image";
import type { Editor } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { Markdown } from "@tiptap/markdown";
import {
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  useEditor,
  type NodeViewProps,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  CheckSquare2,
  Code2,
  Heading1,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Strikethrough,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
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
  const imageExtension = useMemo(
    () => {
      const ImageNodeView = (props: NodeViewProps) => (
        <WorkspaceImageNodeView {...props} ro={ro} userId={userId} />
      );
      return (
      Image.extend({
        addNodeView() {
          return ReactNodeViewRenderer(ImageNodeView);
        },
      }).configure({
        allowBase64: false,
        HTMLAttributes: {
          class:
            "my-7 max-h-[38rem] max-w-full rounded-xl border border-border/70 bg-muted/20 object-contain",
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
        heading: { levels: [1, 2, 3] },
        link: {
          autolink: true,
          defaultProtocol: "https",
          openOnClick: false,
        },
      }),
      imageExtension,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
      }),
      Markdown.configure({
        indentation: { style: "space", size: 2 },
      }),
    ],
    editorProps: {
      attributes: {
        "aria-label": placeholder,
        class:
          "notion-note-prose min-h-[calc(100vh-17rem)] outline-none selection:bg-primary/20",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      if (applyingExternalRef.current) return;
      const markdown = currentEditor.getMarkdown();
      lastEmittedRef.current = markdown;
      onChange(markdown);
      syncVisualSlash(currentEditor, setSlash, setSlashIndex);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      syncVisualSlash(currentEditor, setSlash, setSlashIndex);
      activeTextCallbackRef.current?.(currentEditor.state.selection.$from.parent.textContent.trim());
    },
  }, [imageExtension]);

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
    const href = window.prompt("URL", previous || "https://");
    if (href === null) return;
    if (!href.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
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
        className="flex items-center gap-0.5 rounded-xl border border-border/70 bg-popover/95 p-1 shadow-[0_16px_50px_-18px_rgba(0,0,0,.5)] backdrop-blur-xl"
        shouldShow={({ editor: current }) => !current.state.selection.empty}
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

      <div className="sticky top-3 z-10 mb-6 flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-border/60 bg-background/88 p-1 shadow-sm backdrop-blur-xl">
        <RichButton
          active={editor.isActive("heading", { level: 1 })}
          label={ro ? "Titlu 1" : "Heading 1"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <Heading1 />
        </RichButton>
        <RichButton
          active={editor.isActive("heading", { level: 2 })}
          label={ro ? "Titlu 2" : "Heading 2"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 />
        </RichButton>
        <RichButton
          active={editor.isActive("bulletList")}
          label={ro ? "Listă" : "Bullet list"}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List />
        </RichButton>
        <RichButton
          active={editor.isActive("orderedList")}
          label={ro ? "Listă numerotată" : "Ordered list"}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered />
        </RichButton>
        <RichButton
          active={editor.isActive("taskList")}
          label={ro ? "Listă de sarcini" : "Checklist"}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <CheckSquare2 />
        </RichButton>
        <RichButton
          active={editor.isActive("blockquote")}
          label={ro ? "Citat" : "Quote"}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote />
        </RichButton>
        <RichButton active={false} label={ro ? "Adaugă imagine" : "Add image"} onClick={onOpenImage}>
          <ImagePlus />
        </RichButton>
      </div>

      <EditorContent editor={editor} />

      {slash && filteredVisualCommands.length ? (
        <div
          aria-label={ro ? "Inserează bloc" : "Insert block"}
          className="fixed z-50 max-h-80 w-72 overflow-y-auto rounded-xl border border-border/70 bg-popover/95 p-1.5 text-popover-foreground shadow-[0_18px_60px_-18px_rgba(0,0,0,.5)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95"
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
    </div>
  );
}

function syncVisualSlash(
  editor: Editor,
  setSlash: React.Dispatch<
    React.SetStateAction<{ from: number; left: number; query: string; to: number; top: number } | null>
  >,
  setIndex: React.Dispatch<React.SetStateAction<number>>
) {
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


function WorkspaceImageNodeView({ node, ro, userId }: NodeViewProps & { ro: boolean; userId?: string }) {
  const source = String(node.attrs.src || "");
  const assetId = parseWorkspaceImageId(source);
  const [resolvedSource, setResolvedSource] = useState(assetId ? "" : source);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!assetId || !userId) {
      setResolvedSource(source);
      return;
    }
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

  return (
    <NodeViewWrapper className="my-7">
      {resolvedSource && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- may be an IndexedDB object URL.
        <img
          alt={String(node.attrs.alt || "")}
          className="max-h-[38rem] max-w-full rounded-xl border border-border/70 bg-muted/20 object-contain"
          decoding="async"
          referrerPolicy="no-referrer"
          src={resolvedSource}
        />
      ) : (
        <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-sm text-muted-foreground">
          {failed
            ? String(node.attrs.alt || (ro ? "Imagine indisponibilă" : "Image unavailable"))
            : ro ? "Se încarcă imaginea…" : "Loading image…"}
        </div>
      )}
    </NodeViewWrapper>
  );
}

function RichButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean;
  children: React.ReactElement;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      aria-pressed={active}
      className={cn("size-8 shrink-0", active && "bg-accent text-accent-foreground")}
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

export type NoteOutlineItem = {
  checked?: boolean;
  depth: number;
  id: string;
  kind: "heading" | "task";
  line: number;
  offset: number;
  text: string;
};

export type VisualMarkdownSupport = {
  supported: boolean;
  unsupported: Array<
    "footnotes" | "frontmatter" | "linked-images" | "nested-tables" | "raw-html"
  >;
};

export function getVisualMarkdownSupport(markdown: string): VisualMarkdownSupport {
  const unsupported: VisualMarkdownSupport["unsupported"] = [];
  if (/\[\^[^\]]+\]|^\s*\[\^[^\]]+\]:/m.test(markdown)) unsupported.push("footnotes");
  if (/^(?:\uFEFF)?---\s*\n[\s\S]*?\n(?:---|\.\.\.)\s*(?:\n|$)/.test(markdown)) {
    unsupported.push("frontmatter");
  }
  if (/<!--[\s\S]*?-->|<\/?[a-z][a-z0-9-]*(?:\s[^>]*)?\s*\/?>/i.test(markdown)) {
    unsupported.push("raw-html");
  }
  if (containsLinkedImage(markdown)) unsupported.push("linked-images");
  if (containsNestedTable(markdown)) unsupported.push("nested-tables");
  return { supported: unsupported.length === 0, unsupported };
}

function containsNestedTable(markdown: string) {
  const lines = markdown.split("\n");
  let fence: { character: "`" | "~"; length: number } | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const character = fenceMatch[1][0] as "`" | "~";
      if (!fence) fence = { character, length: fenceMatch[1].length };
      else if (fence.character === character && fenceMatch[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence || index === 0 || !isTableDelimiter(line)) continue;

    const header = lines[index - 1];
    if (
      /^\s*(?:>|[-+*]\s+|\d+[.)]\s+)/.test(header) ||
      /^\s{2,}\S/.test(header) ||
      /^\s{2,}\S/.test(line)
    ) {
      return true;
    }
  }

  return false;
}

function isTableDelimiter(line: string) {
  const value = line.trim();
  return value.includes("|") && /^\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?$/.test(value);
}

export function buildNoteOutline(markdown: string): NoteOutlineItem[] {
  const items: NoteOutlineItem[] = [];
  let offset = 0;
  let fence: { character: "`" | "~"; length: number } | null = null;
  const lines = markdown.split("\n");

  lines.forEach((line, lineIndex) => {
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
    if (fenceMatch) {
      const character = fenceMatch[1][0] as "`" | "~";
      if (!fence) {
        fence = { character, length: fenceMatch[1].length };
      } else if (fence.character === character && fenceMatch[1].length >= fence.length) {
        fence = null;
      }
    } else if (!fence) {
      const heading = line.match(/^\s*(#{1,3})\s+(.+?)\s*#*\s*$/);
      const task = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.+)$/);
      if (heading) {
        items.push({
          depth: heading[1].length,
          id: `heading-${lineIndex}-${offset}`,
          kind: "heading",
          line: lineIndex + 1,
          offset,
          text: cleanOutlineText(heading[2]),
        });
      } else if (/^\s*=+\s*$/.test(lines[lineIndex + 1] || "") && line.trim()) {
        items.push(createHeading(line, lineIndex, offset, 1));
      } else if (/^\s*-+\s*$/.test(lines[lineIndex + 1] || "") && line.trim()) {
        items.push(createHeading(line, lineIndex, offset, 2));
      } else if (task) {
        items.push({
          checked: task[2].toLowerCase() === "x",
          depth: Math.min(3, Math.floor(task[1].length / 2) + 1),
          id: `task-${lineIndex}-${offset}`,
          kind: "task",
          line: lineIndex + 1,
          offset,
          text: cleanOutlineText(task[3]),
        });
      }
    }
    offset += line.length + 1;
  });

  return items.filter((item) => item.text.length > 0);
}

function createHeading(text: string, lineIndex: number, offset: number, depth: number): NoteOutlineItem {
  return {
    depth,
    id: `heading-${lineIndex}-${offset}`,
    kind: "heading",
    line: lineIndex + 1,
    offset,
    text: cleanOutlineText(text),
  };
}

function containsLinkedImage(markdown: string) {
  for (let index = 0; index < markdown.length - 2; index += 1) {
    if (markdown[index] !== "[" || markdown[index + 1] !== "!" || markdown[index + 2] !== "[") {
      continue;
    }
    const imageClose = findBalancedClosing(markdown, index + 2, "[", "]");
    if (imageClose < 0 || markdown[imageClose + 1] !== "(") continue;
    const imageDestinationClose = findBalancedClosing(markdown, imageClose + 1, "(", ")");
    if (imageDestinationClose < 0 || markdown[imageDestinationClose + 1] !== "]") continue;
    if (markdown[imageDestinationClose + 2] === "(") {
      const linkDestinationClose = findBalancedClosing(markdown, imageDestinationClose + 2, "(", ")");
      if (linkDestinationClose >= 0) return true;
    }
  }
  return false;
}

function findBalancedClosing(value: string, start: number, opening: string, closing: string) {
  let depth = 0;
  let escaped = false;
  for (let index = start; index < value.length; index += 1) {
    const character = value[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === opening) depth += 1;
    if (character === closing) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function cleanOutlineText(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

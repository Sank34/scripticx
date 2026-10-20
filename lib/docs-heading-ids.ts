import { slugifyDocsHeading } from "@/lib/docs-content";

type MarkdownNode = {
  type?: string;
  value?: string;
  alt?: string;
  children?: MarkdownNode[];
  data?: { hProperties?: Record<string, unknown> };
};

function headingText(node: MarkdownNode): string {
  return node.value ?? node.alt ?? node.children?.map(headingText).join("") ?? "";
}

export function remarkDocsHeadingIds() {
  return (tree: MarkdownNode) => {
    const occurrences = new Map<string, number>();
    function visit(node: MarkdownNode) {
      if (node.type === "heading") {
        const base = slugifyDocsHeading(headingText(node));
        const occurrence = occurrences.get(base) ?? 0;
        occurrences.set(base, occurrence + 1);
        node.data ??= {};
        node.data.hProperties ??= {};
        node.data.hProperties.id = occurrence === 0 ? base : `${base}-${occurrence + 1}`;
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}

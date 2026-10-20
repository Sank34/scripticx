import { describe, expect, it } from "vitest";
import { extractDocsHeadings } from "./docs-content";
import { remarkDocsHeadingIds } from "./docs-heading-ids";

describe("documentation heading IDs", () => {
  it("assigns stable anchors before React rendering and handles repeated headings", () => {
    const tree = { type: "root", children: [
      { type: "heading", children: [{ type: "text", value: "Șiruri și " }, { type: "inlineCode", value: "LEN" }], data: { hProperties: {} as Record<string, unknown> } },
      { type: "heading", children: [{ type: "text", value: "Șiruri și LEN" }], data: { hProperties: {} as Record<string, unknown> } },
      { type: "code", value: "## Not a heading", data: { hProperties: {} as Record<string, unknown> } },
    ] };
    const transform = remarkDocsHeadingIds();
    const expected = extractDocsHeadings("## Șiruri și `LEN`\n\n## Șiruri și LEN").map(heading => heading.id);
    transform(tree);
    expect(tree.children.slice(0, 2).map(node => node.data.hProperties.id)).toEqual(expected);
    transform(tree);
    expect(tree.children.slice(0, 2).map(node => node.data.hProperties.id)).toEqual(expected);
    expect(tree.children[2].data.hProperties).not.toHaveProperty("id");
    const newPage = { type: "heading", children: [{ type: "text", value: "Șiruri și LEN" }], data: { hProperties: {} as Record<string, unknown> } };
    transform(newPage);
    expect(newPage.data.hProperties.id).toBe(expected[0]);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getWorkspaceImage } = vi.hoisted(() => ({ getWorkspaceImage: vi.fn() }));

vi.mock("@/lib/workspace-assets", () => ({ getWorkspaceImage }));

import { buildPortableNoteMarkdown } from "@/lib/note-export";

class TestFileReader {
  error: Error | null = null;
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;
  result: string | null = null;

  readAsDataURL(blob: Blob) {
    this.result = `data:${blob.type};base64,cG5n`;
    this.onload?.();
  }
}

describe("buildPortableNoteMarkdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("FileReader", TestFileReader);
  });

  it("embeds uploaded workspace images while preserving presentation metadata", async () => {
    getWorkspaceImage.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    const source =
      '![Diagram](workspace-image://asset_123 "scripticx-image:v1;a=r;w=55;o=80")';

    const result = await buildPortableNoteMarkdown(source, "user-1");

    expect(result.markdown).toBe(
      '![Diagram](data:image/png;base64,cG5n "scripticx-image:v1;a=r;w=55;o=80")'
    );
    expect(result.omittedImages).toBe(0);
    expect(getWorkspaceImage).toHaveBeenCalledOnce();
  });

  it("does not rewrite examples inside fenced or inline code", async () => {
    const source = [
      "```md",
      "![Demo](workspace-image://asset_123)",
      "```",
      "`![Inline](workspace-image://asset_456)`",
    ].join("\n");

    const result = await buildPortableNoteMarkdown(source, "user-1");

    expect(result.markdown).toBe(source);
    expect(getWorkspaceImage).not.toHaveBeenCalled();
  });

  it("embeds reference-style images without touching indented code", async () => {
    getWorkspaceImage.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
    const source = [
      "![Diagram][asset]",
      "",
      "[asset]: workspace-image://asset_123 \"Diagram\"",
      "",
      "    ![Example](workspace-image://asset_456)",
    ].join("\n");

    const result = await buildPortableNoteMarkdown(source, "user-1");

    expect(result.markdown).toContain(
      '[asset]: data:image/png;base64,cG5n "Diagram"'
    );
    expect(result.markdown).toContain(
      "    ![Example](workspace-image://asset_456)"
    );
    expect(getWorkspaceImage).toHaveBeenCalledOnce();
  });

  it("keeps a missing image reference and reports it once", async () => {
    getWorkspaceImage.mockResolvedValue(null);
    const source = "![One](workspace-image://asset_123)\n![Again](workspace-image://asset_123)";

    const result = await buildPortableNoteMarkdown(source, "user-1");

    expect(result.markdown).toBe(source);
    expect(result.omittedImages).toBe(1);
    expect(getWorkspaceImage).toHaveBeenCalledOnce();
  });
});

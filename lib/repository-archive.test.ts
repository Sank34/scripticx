import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { createProjectDirectory, createProjectFile } from "./editor-project";
import { buildRepositoryArchive } from "./repository-archive";

describe("repository ZIP downloads", () => {
  it("preserves nested paths, empty directories and UTF-8 content", () => {
    const { filename, bytes } = buildRepositoryArchive("Demo repo", [
      createProjectDirectory("empty"),
      createProjectFile("src/test.py", 'print("șir")'),
    ]);

    expect(filename).toBe("Demo-repo.zip");
    const extracted = unzipSync(bytes);
    expect(extracted["Demo-repo/empty/"]).toHaveLength(0);
    expect(strFromU8(extracted["Demo-repo/src/test.py"])).toBe('print("șir")');
  });

  it("rejects archive paths that escape the repository directory", () => {
    expect(() => buildRepositoryArchive("Demo", [
      createProjectFile("src/../../outside.txt", "unsafe"),
    ])).toThrow("Invalid repository archive path");
  });
});

import { strToU8, zipSync } from "fflate";

import type { ProjectEntry } from "@/lib/editor-project";

export function buildRepositoryArchive(title: string, entries: ProjectEntry[]) {
  const name = title.trim().replace(/[^\p{L}\p{N}_.-]+/gu, "-")
    .replace(/^[.-]+|[.-]+$/g, "").slice(0, 80) || "repository";
  const contents: Record<string, Uint8Array> = Object.create(null);

  for (const entry of entries) {
    if (entry.path.split("/").some((part) => !part || part === "." || part === ".." || /[\\:\p{Cc}]/u.test(part))) {
      throw new Error("Invalid repository archive path");
    }

    const path = `${name}/${entry.path}${entry.kind === "directory" ? "/" : ""}`;
    if (Object.hasOwn(contents, path)) throw new Error("Duplicate repository archive path");

    contents[path] = entry.kind === "directory" ? new Uint8Array() : strToU8(entry.content);
  }

  return { filename: `${name}.zip`, bytes: zipSync(contents, { level: 3 }) };
}

import type { ProjectFile, ProjectTreeNode } from "@/lib/editor-project";

export function repositoryHref(id: string, fileId?: string) {
  const path = `/repos/${encodeURIComponent(id)}`;
  return fileId ? `${path}?file=${encodeURIComponent(fileId)}` : path;
}

export function findRepositoryReadme(files: ProjectFile[]) {
  return files.find((file) => file.path.toLowerCase() === "readme.md");
}

export function repositoryPathHref(id: string, path: string) {
  const root = repositoryHref(id);
  return path ? `${root}?path=${encodeURIComponent(path)}` : root;
}

export function resolveRepositoryPath(tree: ProjectTreeNode[], path: string) {
  const trail: ProjectTreeNode[] = [];
  let entries = tree;

  for (const segment of path ? path.split("/") : []) {
    const node = entries.find((entry) => entry.name === segment);
    if (!node) return { trail: [], entries: tree, file: undefined };
    trail.push(node);
    entries = node.children;
  }

  return { trail, entries, file: trail.at(-1)?.file };
}

export function findRepositoryLicense(files: ProjectFile[]) {
  return files.find((file) => /^(?:licen[sc]e|copying)(?:\.(?:md|txt))?$/i.test(file.path));
}

export function getRepositoryLanguageBreakdown(files: ProjectFile[]) {
  const encoder = new TextEncoder();
  const sizes = new Map<ProjectFile["language"], number>();
  let total = 0;

  for (const file of files) {
    if (["text", "markdown", "json", "yaml", "notebook"].includes(file.language)) continue;
    const size = encoder.encode(file.content).byteLength;
    if (!size) continue;
    sizes.set(file.language, (sizes.get(file.language) ?? 0) + size);
    total += size;
  }

  return Array.from(sizes, ([language, bytes]) => ({ language, share: bytes / total }))
    .sort((a, b) => b.share - a.share);
}

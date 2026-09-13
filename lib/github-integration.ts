export const GITHUB_MANAGED_FILE_LIMIT = 200;
export const GITHUB_MANAGED_FILE_BYTES = 512_000;
export const GITHUB_MANAGED_TOTAL_BYTES = 5_000_000;

const SUPPORTED_EXTENSIONS = new Set([
  "bash",
  "c",
  "cc",
  "cjs",
  "cpp",
  "cs",
  "css",
  "cuh",
  "cu",
  "cxx",
  "go",
  "h",
  "hh",
  "hpp",
  "htm",
  "html",
  "hxx",
  "ipp",
  "java",
  "js",
  "json",
  "jsonc",
  "jsx",
  "md",
  "mdx",
  "mjs",
  "msp",
  "py",
  "pyi",
  "pyw",
  "rs",
  "sass",
  "scss",
  "sh",
  "sql",
  "toml",
  "tpp",
  "ts",
  "tsx",
  "txt",
  "xml",
  "yaml",
  "yml",
  "zsh",
]);

const SUPPORTED_FILE_NAMES = new Set([
  ".dockerignore",
  ".editorconfig",
  ".gitignore",
  ".npmrc",
  ".prettierignore",
  "cmakelists.txt",
  "dockerfile",
  "gemfile",
  "makefile",
  "procfile",
  "requirements.txt",
]);

export type GitHubRepository = {
  defaultBranch: string;
  description: string | null;
  fullName: string;
  id: number;
  installationId: number;
  isPrivate: boolean;
  name: string;
  owner: string;
  updatedAt: string | null;
};

export type GitHubProjectLink = {
  branch: string;
  defaultBranch: string;
  fileHashes: Record<string, string>;
  headSha: string | null;
  installationId: number;
  lastSyncedAt: string | null;
  owner: string;
  remoteHeadSha: string | null;
  repo: string;
  repositoryId: number;
  syncStatus: "clean" | "behind" | "conflict" | "unknown";
  trackedPaths: string[];
};

export type GitHubRemoteFile = {
  content: string;
  path: string;
};

export type GitHubProjectEntry =
  | { kind: "directory"; name: string; path: string }
  | { content: string; kind: "file"; name: string; path: string };

export function isSafeGitHubPath(value: string) {
  if (!value || value.length > 1024 || value.includes("\0") || value.includes("\\")) {
    return false;
  }
  if (value.startsWith("/") || value.endsWith("/")) return false;
  const parts = value.split("/");
  return parts.every(
    (part) => Boolean(part) && part !== "." && part !== ".." && part !== ".git"
  );
}

export function isSupportedGitHubTextPath(path: string) {
  if (!isSafeGitHubPath(path)) return false;
  const fileName = path.split("/").at(-1)?.toLowerCase() || "";
  if (SUPPORTED_FILE_NAMES.has(fileName)) return true;
  const extension = fileName.includes(".") ? fileName.split(".").at(-1) || "" : "";
  return SUPPORTED_EXTENSIONS.has(extension);
}

export function isValidGitHubOwner(value: string) {
  return /^(?!-)[A-Za-z0-9-]{1,39}(?<!-)$/.test(value);
}

export function isValidGitHubRepositoryName(value: string) {
  return /^[A-Za-z0-9_.-]{1,100}$/.test(value) && value !== "." && value !== "..";
}

export function isValidGitBranchName(value: string) {
  if (!value || value.length > 255) return false;
  if (
    value.startsWith("/") ||
    value.endsWith("/") ||
    value.startsWith(".") ||
    value.endsWith(".") ||
    value.endsWith(".lock") ||
    value.includes("..") ||
    value.includes("@{") ||
    /[\x00-\x20~^:?*[\\]/.test(value)
  ) {
    return false;
  }
  return value.split("/").every((part) => Boolean(part) && !part.startsWith("."));
}

export function normalizeGitHubFiles(files: GitHubRemoteFile[]) {
  const seen = new Set<string>();
  let totalBytes = 0;

  return files.map((file) => {
    const path = file.path.trim();
    if (!isSafeGitHubPath(path) || !isSupportedGitHubTextPath(path) || seen.has(path)) {
      throw new Error("Invalid GitHub project file");
    }
    const bytes = new TextEncoder().encode(file.content).byteLength;
    if (bytes > GITHUB_MANAGED_FILE_BYTES) throw new Error("GitHub project file is too large");
    totalBytes += bytes;
    if (totalBytes > GITHUB_MANAGED_TOTAL_BYTES) throw new Error("GitHub project is too large");
    seen.add(path);
    return { path, content: file.content };
  });
}

export function buildGitHubProjectEntries(files: GitHubRemoteFile[]): GitHubProjectEntry[] {
  const directoryPaths = new Set<string>();
  for (const file of files) {
    const parts = file.path.split("/").filter(Boolean);
    parts.pop();
    let path = "";
    for (const part of parts) {
      path = path ? `${path}/${part}` : part;
      directoryPaths.add(path);
    }
  }

  return [
    ...[...directoryPaths].sort().map((path) => ({
      kind: "directory" as const,
      name: path.split("/").at(-1) || path,
      path,
    })),
    ...files.map((file) => ({
      kind: "file" as const,
      name: file.path.split("/").at(-1) || file.path,
      path: file.path,
      content: file.content,
    })),
  ];
}

export function getChangedGitHubPaths(
  currentHashes: Record<string, string>,
  remoteHashes: Record<string, string>
) {
  const changed = Object.entries(currentHashes)
    .filter(([path, hash]) => remoteHashes[path] !== hash)
    .map(([path]) => path);
  const deleted = Object.keys(remoteHashes).filter((path) => !(path in currentHashes));
  return { changed: changed.sort(), deleted: deleted.sort() };
}

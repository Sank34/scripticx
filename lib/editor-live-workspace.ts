import {
  createProjectFile,
  normalizeProjectEntries,
  normalizeProjectPath,
  serializeProjectEntries,
  type ProjectDirectory,
  type ProjectFile,
} from "./editor-project";

const LIVE_WORKSPACE_PREFIX = "SCRIPTICX_WORKSPACE_V1:";

export function isSerializedLiveWorkspace(value: string) {
  return value.startsWith(LIVE_WORKSPACE_PREFIX);
}

export type LiveProjectOrigin = {
  projectId: string;
  ownerId: string;
  github?: { owner: string; repo: string; branch: string };
};

function parseProjectOrigin(value: unknown): LiveProjectOrigin | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.projectId !== "string" || !candidate.projectId || candidate.projectId.length > 100 ||
    typeof candidate.ownerId !== "string" || !candidate.ownerId || candidate.ownerId.length > 100
  ) return null;
  const github = candidate.github as Record<string, unknown> | undefined;
  return {
    projectId: candidate.projectId, ownerId: candidate.ownerId,
    ...(github && [github.owner, github.repo, github.branch].every(item => typeof item === "string" && item.length > 0 && item.length <= 255)
      ? { github: { owner: github.owner as string, repo: github.repo as string, branch: github.branch as string } } : {}),
  };
}

export type LiveWorkspaceDocument = {
  version: 1;
  title: string;
  description: string;
  files: ProjectFile[];
  directories: ProjectDirectory[];
  activeFileId: string | null;
  project: LiveProjectOrigin | null;
};

type SerializedLiveWorkspace = {
  version: 1;
  title?: unknown;
  description?: unknown;
  entries?: unknown;
  activeFileId?: unknown;
  project?: unknown;
};

export function createLiveWorkspaceDocument(input: {
  title?: string;
  description?: string;
  files: ProjectFile[];
  directories: ProjectDirectory[];
  activeFileId?: string | null;
  project?: LiveProjectOrigin | null;
}): LiveWorkspaceDocument {
  const project = normalizeProjectEntries(
    serializeProjectEntries(input.files, input.directories),
    ""
  );
  const requestedActiveId = input.activeFileId ?? null;

  return {
    version: 1,
    title: input.title?.trim() || "Untitled project",
    description: input.description?.trim() || "",
    files: project.files,
    directories: project.directories,
    project: parseProjectOrigin(input.project),
    activeFileId: project.files.some((file) => file.id === requestedActiveId)
      ? requestedActiveId
      : project.files[0]?.id ?? null,
  };
}

export function serializeLiveWorkspace(document: LiveWorkspaceDocument) {
  return `${LIVE_WORKSPACE_PREFIX}${JSON.stringify({
    version: 1,
    title: document.title,
    description: document.description,
    entries: serializeProjectEntries(document.files, document.directories),
    activeFileId: document.activeFileId,
    project: document.project,
  })}`;
}

export function parseLiveWorkspace(value: string | null | undefined) {
  if (!value?.startsWith(LIVE_WORKSPACE_PREFIX)) {
    const file = createProjectFile("main.msp", value || "");
    return createLiveWorkspaceDocument({
      title: "Live project",
      files: [file],
      directories: [],
      activeFileId: file.id,
    });
  }

  try {
    const payload = JSON.parse(
      value.slice(LIVE_WORKSPACE_PREFIX.length)
    ) as SerializedLiveWorkspace;
    if (
      payload.version !== 1 || !Array.isArray(payload.entries) ||
      !payload.entries.some((entry: Record<string, unknown>) =>
        entry?.kind === "file" && typeof entry.path === "string" &&
        normalizeProjectPath(entry.path) && typeof entry.content === "string"
      )
    ) throw new Error("Invalid shared workspace");
    const project = normalizeProjectEntries(payload.entries, "");

    return createLiveWorkspaceDocument({
      title: typeof payload.title === "string" ? payload.title : "Live project",
      description:
        typeof payload.description === "string" ? payload.description : "",
      files: project.files,
      directories: project.directories,
      project: parseProjectOrigin(payload.project),
      activeFileId:
        typeof payload.activeFileId === "string" ? payload.activeFileId : null,
    });
  } catch {
    throw new Error("The shared project could not be loaded. Its workspace data is invalid.");
  }
}

export function getLiveWorkspaceFingerprint(document: LiveWorkspaceDocument) {
  return JSON.stringify({
    version: document.version,
    title: document.title,
    description: document.description,
    entries: serializeProjectEntries(document.files, document.directories),
    project: document.project,
  });
}

export function getLiveWorkspaceUrl(roomId: string, origin = "") {
  const path = `/editor?live=${encodeURIComponent(roomId)}&view=live`;
  return origin ? `${origin.replace(/\/$/, "")}${path}` : path;
}

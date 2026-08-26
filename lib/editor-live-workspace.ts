import {
  createProjectFile,
  normalizeProjectEntries,
  serializeProjectEntries,
  type ProjectDirectory,
  type ProjectFile,
} from "./editor-project";

const LIVE_WORKSPACE_PREFIX = "SCRIPTICX_WORKSPACE_V1:";

export type LiveWorkspaceDocument = {
  version: 1;
  title: string;
  description: string;
  files: ProjectFile[];
  directories: ProjectDirectory[];
  activeFileId: string | null;
};

type SerializedLiveWorkspace = {
  version: 1;
  title?: unknown;
  description?: unknown;
  entries?: unknown;
  activeFileId?: unknown;
};

export function createLiveWorkspaceDocument(input: {
  title?: string;
  description?: string;
  files: ProjectFile[];
  directories: ProjectDirectory[];
  activeFileId?: string | null;
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
    const project = normalizeProjectEntries(payload.entries, "");

    return createLiveWorkspaceDocument({
      title: typeof payload.title === "string" ? payload.title : "Live project",
      description:
        typeof payload.description === "string" ? payload.description : "",
      files: project.files,
      directories: project.directories,
      activeFileId:
        typeof payload.activeFileId === "string" ? payload.activeFileId : null,
    });
  } catch {
    const file = createProjectFile("main.msp", value);
    return createLiveWorkspaceDocument({
      title: "Recovered live project",
      files: [file],
      directories: [],
      activeFileId: file.id,
    });
  }
}

export function getLiveWorkspaceFingerprint(document: LiveWorkspaceDocument) {
  return JSON.stringify({
    version: document.version,
    title: document.title,
    description: document.description,
    entries: serializeProjectEntries(document.files, document.directories),
  });
}

export function getLiveWorkspaceUrl(roomId: string, origin = "") {
  const path = `/editor?live=${encodeURIComponent(roomId)}&view=live`;
  return origin ? `${origin.replace(/\/$/, "")}${path}` : path;
}

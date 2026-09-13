export const EDITOR_LANGUAGES = [
  { key: "msp", monaco: "miniscriptplus", label: "MiniScript+", extensions: ["msp"], runnable: true },
  { key: "typescript", monaco: "typescript", label: "TypeScript", extensions: ["ts"], runnable: false },
  { key: "typescriptreact", monaco: "typescript", label: "TypeScript React", extensions: ["tsx"], runnable: false },
  { key: "javascript", monaco: "javascript", label: "JavaScript", extensions: ["js", "mjs", "cjs"], runnable: false },
  { key: "javascriptreact", monaco: "javascript", label: "JavaScript React", extensions: ["jsx"], runnable: false },
  { key: "python", monaco: "python", label: "Python", extensions: ["py", "pyw", "pyi"], runnable: false },
  { key: "cpp", monaco: "cpp", label: "C++", extensions: ["cpp", "cc", "cxx", "hpp", "hh", "hxx", "ipp", "tpp", "cu", "cuh"], runnable: false },
  { key: "c", monaco: "c", label: "C", extensions: ["c", "h"], runnable: false },
  { key: "java", monaco: "java", label: "Java", extensions: ["java"], runnable: false },
  { key: "csharp", monaco: "csharp", label: "C#", extensions: ["cs"], runnable: false },
  { key: "go", monaco: "go", label: "Go", extensions: ["go"], runnable: false },
  { key: "rust", monaco: "rust", label: "Rust", extensions: ["rs"], runnable: false },
  { key: "html", monaco: "html", label: "HTML", extensions: ["html", "htm"], runnable: false },
  { key: "css", monaco: "css", label: "CSS", extensions: ["css"], runnable: false },
  { key: "scss", monaco: "scss", label: "SCSS", extensions: ["scss", "sass"], runnable: false },
  { key: "json", monaco: "json", label: "JSON", extensions: ["json", "jsonc"], runnable: false },
  { key: "markdown", monaco: "markdown", label: "Markdown", extensions: ["md", "mdx"], runnable: false },
  { key: "shell", monaco: "shell", label: "Shell", extensions: ["sh", "bash", "zsh"], runnable: false },
  { key: "sql", monaco: "sql", label: "SQL", extensions: ["sql"], runnable: false },
  { key: "yaml", monaco: "yaml", label: "YAML", extensions: ["yaml", "yml"], runnable: false },
  { key: "text", monaco: "plaintext", label: "Plain text", extensions: ["txt"], runnable: false },
] as const;

export type EditorLanguageKey = (typeof EDITOR_LANGUAGES)[number]["key"];

export type ProjectFile = {
  id: string;
  kind: "file";
  name: string;
  path: string;
  language: EditorLanguageKey;
  content: string;
};

export type ProjectDirectory = {
  id: string;
  kind: "directory";
  name: string;
  path: string;
};

export type ProjectEntry = ProjectFile | ProjectDirectory;

export type ProjectTemplateKey = "msp" | "python" | "cpp";

export type ProjectTreeNode = {
  id: string;
  name: string;
  path: string;
  kind: "file" | "directory";
  file?: ProjectFile;
  children: ProjectTreeNode[];
};

export function createProjectId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function normalizeProjectPath(path: string) {
  return path
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part && part !== ".")
    .join("/");
}

export function getProjectBaseName(path: string) {
  return normalizeProjectPath(path).split("/").at(-1) || "untitled";
}

export function getProjectParentPath(path: string) {
  const parts = normalizeProjectPath(path).split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

export function getEditorLanguage(path: string): EditorLanguageKey {
  const normalized = normalizeProjectPath(path).toLowerCase();
  const fileName = getProjectBaseName(normalized);
  const extension = fileName.includes(".") ? fileName.split(".").at(-1) || "" : "";

  if (fileName === "dockerfile") return "shell";
  if (fileName === "makefile") return "shell";

  return (
    EDITOR_LANGUAGES.find((language) =>
      language.extensions.some((candidate) => candidate === extension)
    )?.key ?? "text"
  );
}

export function getEditorLanguageDefinition(language: EditorLanguageKey) {
  return EDITOR_LANGUAGES.find((candidate) => candidate.key === language) ?? EDITOR_LANGUAGES.at(-1)!;
}

export function createProjectFile(path = "main.msp", content = ""): ProjectFile {
  const normalizedPath = normalizeProjectPath(path) || "main.msp";
  return {
    id: createProjectId(),
    kind: "file",
    name: getProjectBaseName(normalizedPath),
    path: normalizedPath,
    language: getEditorLanguage(normalizedPath),
    content,
  };
}

export function createProjectDirectory(path: string): ProjectDirectory {
  const normalizedPath = normalizeProjectPath(path);
  return {
    id: createProjectId(),
    kind: "directory",
    name: getProjectBaseName(normalizedPath),
    path: normalizedPath,
  };
}

export function createProjectTemplate(template: ProjectTemplateKey) {
  if (template === "python") {
    return {
      title: "Python project",
      files: [
        createProjectFile(
          "src/main.py",
          `def main() -> None:\n    print("Hello from ScripticX")\n\n\nif __name__ == "__main__":\n    main()\n`
        ),
        createProjectFile("tests/test_main.py", ""),
        createProjectFile("requirements.txt", ""),
        createProjectFile(
          ".gitignore",
          `.venv/\n__pycache__/\n*.py[cod]\n.pytest_cache/\n`
        ),
        createProjectFile(
          "README.md",
          "# Python project\n\nCreated with the ScripticX editor.\n"
        ),
      ],
      directories: [
        createProjectDirectory("src"),
        createProjectDirectory("tests"),
      ],
    };
  }

  if (template === "cpp") {
    return {
      title: "C++ project",
      files: [
        createProjectFile(
          "src/main.cpp",
          `#include <iostream>\n\nint main() {\n    std::cout << "Hello from ScripticX\\n";\n    return 0;\n}\n`
        ),
        createProjectFile(
          "CMakeLists.txt",
          `cmake_minimum_required(VERSION 3.20)\nproject(scripticx_project LANGUAGES CXX)\n\nset(CMAKE_CXX_STANDARD 20)\nset(CMAKE_CXX_STANDARD_REQUIRED ON)\n\nadd_executable(scripticx_app src/main.cpp)\ntarget_include_directories(scripticx_app PRIVATE include)\n`
        ),
        createProjectFile(
          ".gitignore",
          `build/\ncmake-build-*/\n*.o\n*.out\n`
        ),
        createProjectFile(
          "README.md",
          "# C++ project\n\nCMake-ready project created with the ScripticX editor.\n"
        ),
      ],
      directories: [
        createProjectDirectory("src"),
        createProjectDirectory("include"),
      ],
    };
  }

  return {
    title: "MiniScript+ project",
    files: [
      createProjectFile(
        "main.msp",
        `X = 0\nWHILE X < 3\n  PRINT X\n  X = X + 1\nEND\n`
      ),
      createProjectFile(
        "README.md",
        "# MiniScript+ project\n\nCreated with the ScripticX editor.\n"
      ),
    ],
    directories: [] as ProjectDirectory[],
  };
}

export function normalizeProjectEntries(entries: unknown, fallbackCode: string) {
  if (!Array.isArray(entries)) {
    return {
      files: [createProjectFile("main.msp", fallbackCode)],
      directories: [] as ProjectDirectory[],
    };
  }

  const files: ProjectFile[] = [];
  const directories: ProjectDirectory[] = [];

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;

    const candidate = entry as Record<string, unknown>;
    const rawPath =
      typeof candidate.path === "string"
        ? candidate.path
        : typeof candidate.name === "string"
          ? candidate.name
          : "";
    const path = normalizeProjectPath(rawPath);
    if (!path) continue;

    if (candidate.kind === "directory") {
      directories.push({
        id: typeof candidate.id === "string" ? candidate.id : createProjectId(),
        kind: "directory",
        name: getProjectBaseName(path),
        path,
      });
      continue;
    }

    files.push({
      id: typeof candidate.id === "string" ? candidate.id : createProjectId(),
      kind: "file",
      name: getProjectBaseName(path),
      path,
      language: getEditorLanguage(path),
      content: typeof candidate.content === "string" ? candidate.content : "",
    });
  }

  return {
    files: files.length ? files : [createProjectFile("main.msp", fallbackCode)],
    directories: dedupeDirectories(directories),
  };
}

export function serializeProjectEntries(files: ProjectFile[], directories: ProjectDirectory[]) {
  return [...dedupeDirectories(directories), ...files];
}

export function collectProjectDirectories(files: ProjectFile[], directories: ProjectDirectory[]) {
  const paths = new Set(directories.map((directory) => directory.path));

  for (const file of files) {
    const parts = getProjectParentPath(file.path).split("/").filter(Boolean);
    let path = "";
    for (const part of parts) {
      path = path ? `${path}/${part}` : part;
      paths.add(path);
    }
  }

  return [...paths]
    .sort((a, b) => a.localeCompare(b))
    .map(
      (path) =>
        directories.find((directory) => directory.path === path) ?? {
          id: `directory:${path}`,
          kind: "directory" as const,
          name: getProjectBaseName(path),
          path,
        }
    );
}

function dedupeDirectories(directories: ProjectDirectory[]) {
  return [...new Map(directories.map((directory) => [directory.path, directory])).values()];
}

export function buildProjectTree(files: ProjectFile[], directories: ProjectDirectory[]): ProjectTreeNode[] {
  const root: ProjectTreeNode = {
    id: "root",
    name: "root",
    path: "",
    kind: "directory",
    children: [],
  };
  const directoryMap = new Map<string, ProjectTreeNode>([["", root]]);

  for (const directory of collectProjectDirectories(files, directories)) {
    const parts = directory.path.split("/");
    let currentPath = "";

    for (const part of parts) {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (directoryMap.has(currentPath)) continue;

      const node: ProjectTreeNode = {
        id: currentPath === directory.path ? directory.id : `directory:${currentPath}`,
        name: part,
        path: currentPath,
        kind: "directory",
        children: [],
      };
      directoryMap.set(currentPath, node);
      directoryMap.get(parentPath)?.children.push(node);
    }
  }

  for (const file of files) {
    const parent = directoryMap.get(getProjectParentPath(file.path)) ?? root;
    parent.children.push({
      id: file.id,
      name: file.name,
      path: file.path,
      kind: "file",
      file,
      children: [],
    });
  }

  const sortNodes = (nodes: ProjectTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(root.children);

  return root.children;
}

export function isValidProjectPath(path: string) {
  const normalized = normalizeProjectPath(path);
  if (!normalized || normalized.startsWith("/")) return false;
  return normalized.split("/").every((part) => /^[\w.@()+ -]+$/.test(part) && part !== "..");
}

/* global TreeSitter, importScripts, jsyaml */
importScripts("/syntax/tree-sitter.js");
const ready = TreeSitter.init({ locateFile: () => "/syntax/tree-sitter.wasm" });
const languages = new Map();
let latest = 0;
self.onmessage = async ({ data: { id, language, code } }) => {
  latest = id;
  let parser;
  let tree;
  try {
    if (language === "yaml") {
      importScripts("/syntax/js-yaml.js");
      try {
        jsyaml.loadAll(code, undefined, { schema: jsyaml.JSON_SCHEMA });
        self.postMessage({ id, errors: [] });
      } catch (error) {
        const row = (error.mark?.line || 0) + 1;
        const column = (error.mark?.column || 0) + 1;
        self.postMessage({ id, errors: [{ startLineNumber: row, endLineNumber: row, startColumn: column, endColumn: column + 1, message: error.reason || "Invalid YAML" }] });
      }
      return;
    }
    await ready;
    if (!languages.has(language)) languages.set(language, TreeSitter.Language.load(`/syntax/tree-sitter-${language}.wasm`));
    const grammar = await languages.get(language);
    if (latest !== id) return;
    parser = new TreeSitter();
    parser.setLanguage(grammar);
    parser.setTimeoutMicros(100_000);
    tree = parser.parse(code);
    const errors = [];
    const visit = (node) => {
      if (errors.length >= 50) return;
      if (node.type === "ERROR" || node.isMissing) {
        errors.push({
          startLineNumber: node.startPosition.row + 1,
          startColumn: node.startPosition.column + 1,
          endLineNumber: node.endPosition.row + 1,
          endColumn: node.endPosition.column + 1,
          message: node.isMissing ? `Expected ${node.type}` : "Invalid syntax",
        });
        return;
      }
      if (node.hasError) node.children.forEach(visit);
    };
    if (tree) visit(tree.rootNode);
    self.postMessage({ id, errors });
  } catch {
    self.postMessage({ id, errors: [], unavailable: true });
  } finally {
    tree?.delete();
    parser?.delete();
  }
};

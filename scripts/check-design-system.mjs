import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { relative, resolve } from "node:path";

const projectRoot = process.cwd();
const strict = !process.argv.includes("--adoption");
const sourceRoots = ["app", "components"];
const governedRoots = ["app/admin/design-system/", "components/admin/design-system/"];

const requiredFiles = [
  "docs/design-guide.md",
  "app/admin/design-system/page.tsx",
  "components/admin/design-system/DesignSystemShowcase.tsx",
  "app/globals.css",
];

const requiredTokens = [
  "--sx-success",
  "--sx-warning",
  "--sx-info",
  "--sx-space-4",
  "--sx-radius-control",
  "--sx-radius-card",
  "--sx-radius-panel",
  "--sx-radius-shell",
  "--sx-shadow-subtle",
  "--sx-shadow-raised",
  "--sx-motion-standard",
  "--sx-ease-standard",
  "--sx-content-max",
  "--sx-reading-max",
];

const rules = [
  {
    id: "decorative-gradient",
    message: "Avoid decorative gradients in product UI.",
    expression: /\bbg-gradient-(?:to|linear|radial)\b|\bbg-\[(?:linear|radial|conic)-gradient/g,
  },
  {
    id: "wide-tracking",
    message: "Do not use wide letter spacing for interface labels or subtitles.",
    expression: /\btracking-(?:wide|wider|widest|\[[^\]]+\])/g,
  },
  {
    id: "decorative-shadow",
    message: "Use shared elevation tokens instead of arbitrary shadows.",
    expression: /\bshadow-\[[^\]]+\]/g,
  },
  {
    id: "colored-shadow",
    message: "Do not tint elevation. Use the shared neutral elevation tokens.",
    expression: /\bshadow-(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-/g,
  },
  {
    id: "raw-large-radius",
    message: "Use a shared panel or shell radius token instead of a raw large radius.",
    expression: /\brounded-\[(?:2\d|3\d)px\]/g,
  },
  {
    id: "inline-drop-shadow",
    message: "Use the shared neutral elevation tokens instead of inline drop shadows.",
    expression: /drop-shadow\s*\(/g,
  },
  {
    id: "browser-dialog",
    message: "Use the shared dialog components instead of browser dialogs.",
    expression: /\b(?:window\.)?(?:alert|confirm|prompt)\s*\(/g,
  },
];

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = resolve(directory, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) return walk(fullPath);
    return /\.(?:tsx|jsx)$/.test(entry) ? [fullPath] : [];
  });
}

function lineForIndex(source, index) {
  return source.slice(0, index).split("\n").length;
}

const structuralErrors = [];

for (const file of requiredFiles) {
  if (!existsSync(resolve(projectRoot, file))) {
    structuralErrors.push(`Missing required artifact: ${file}`);
  }
}

const globalsPath = resolve(projectRoot, "app/globals.css");
if (existsSync(globalsPath)) {
  const globals = readFileSync(globalsPath, "utf8");
  for (const token of requiredTokens) {
    if (!globals.includes(token)) structuralErrors.push(`Missing design token: ${token}`);
  }
}

const files = sourceRoots.flatMap((directory) => walk(resolve(projectRoot, directory)));
const findings = [];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const filePath = relative(projectRoot, file);

  for (const rule of rules) {
    const expression = new RegExp(rule.expression.source, rule.expression.flags);
    for (const match of source.matchAll(expression)) {
      findings.push({
        governed: governedRoots.some((root) => filePath.startsWith(root)),
        file: filePath,
        line: lineForIndex(source, match.index ?? 0),
        rule: rule.id,
        message: rule.message,
      });
    }
  }
}

const enforcedFindings = strict ? findings : findings.filter((finding) => finding.governed);
const legacyFindings = findings.filter((finding) => !finding.governed);

console.log("ScripticX design-system check\n");
console.log(`Mode: ${strict ? "strict (all product UI)" : "adoption report (governed files enforced)"}`);
console.log(`Artifacts: ${requiredFiles.length - structuralErrors.filter((error) => error.startsWith("Missing required artifact")).length}/${requiredFiles.length}`);
console.log(`UI findings: ${findings.length} total, ${enforcedFindings.length} enforced, ${legacyFindings.length} legacy`);

if (structuralErrors.length) {
  console.error("\nStructural errors:");
  for (const error of structuralErrors) console.error(`  - ${error}`);
}

if (enforcedFindings.length) {
  console.error("\nEnforced findings:");
  for (const finding of enforcedFindings.slice(0, 40)) {
    console.error(`  - ${finding.file}:${finding.line} [${finding.rule}] ${finding.message}`);
  }
  if (enforcedFindings.length > 40) {
    console.error(`  - …and ${enforcedFindings.length - 40} more`);
  }
}

if (!strict && legacyFindings.length) {
  const counts = new Map();
  for (const finding of legacyFindings) {
    counts.set(finding.rule, (counts.get(finding.rule) ?? 0) + 1);
  }
  console.log("\nLegacy migration report (warning only):");
  for (const [rule, count] of [...counts.entries()].sort()) {
    console.log(`  - ${rule}: ${count}`);
  }
  console.log("Run `npm run design:check:strict` to inspect the full enforcement target.");
}

if (structuralErrors.length || enforcedFindings.length) {
  process.exitCode = 1;
} else {
  console.log("\nDesign-system contract passed.");
}

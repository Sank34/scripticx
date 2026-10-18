import { tokenizeTerminalCommand } from "@/lib/code-runner";

const requirement = /^[A-Za-z0-9][A-Za-z0-9._-]*(?:\[[A-Za-z0-9_,.-]+\])?(?:(?:==|~=|>=|<=|>|<|!=)[A-Za-z0-9.*+!_-]+(?:,(?:==|~=|>=|<=|>|<|!=)[A-Za-z0-9.*+!_-]+)*)?$/;
export function pythonRequirements(content: string) {
  const lines = content.split(/\r?\n/).map(line => line.replace(/\s+#.*$/, "").trim()).filter(line => line && !line.startsWith("#"));
  if (lines.length > 16 || lines.some(line => line.length > 160 || !requirement.test(line))) throw new Error("Use up to 16 PyPI package names with optional versions; URLs and pip options are not supported.");
  return [...new Set(lines)];
}
export function pythonPackageCommand(source: string, existing: string): { requirements: string; addedPackages: string[] } | null {
  const { tokens, error } = tokenizeTerminalCommand(source);
  const isPip = ["pip", "pip3"].includes(tokens[0]) || ["python", "python3"].includes(tokens[0]) && tokens[1] === "-m" && tokens[2] === "pip";
  if (!isPip) return null;
  if (error) throw new Error(error);
  const args = tokens.slice(tokens[0].startsWith("pip") ? 1 : 3);
  if (args[0] !== "install" || args.length < 2) throw new Error("Use pip install <packages> or pip install -r requirements.txt");
  if (args.length === 3 && args[1] === "-r" && args[2] === "requirements.txt") return { requirements: pythonRequirements(existing).join("\n") + "\n", addedPackages: [] };
  const requested = pythonRequirements(args.slice(1).join("\n"));
  const key = (value: string) => value.split(/[\[<>=!~]/)[0].toLowerCase().replace(/[-_.]+/g, "-");
  const packages = new Map(pythonRequirements(existing).map(value => [key(value), value]));
  for (const value of requested) packages.set(key(value), value);
  return { requirements: pythonRequirements([...packages.values()].join("\n")).join("\n") + "\n", addedPackages: requested.map(value => value.split(/[<>=!~]/)[0]) };
}

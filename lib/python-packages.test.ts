import { describe, expect, it } from "vitest";
import { pythonPackageCommand, pythonRequirements } from "@/lib/python-packages";

describe("Python package commands", () => {
  it("merges pip and python -m pip installations without losing existing dependencies", () => {
    expect(pythonPackageCommand("pip install requests numpy==2.3.0", "pandas\nrequests==2.0\n")?.requirements).toBe("pandas\nrequests\nnumpy==2.3.0\n");
    expect(pythonPackageCommand("python3 -m pip install rich", "")?.requirements).toBe("rich\n");
  });
  it("supports requirements files without treating normal Python runs as pip", () => {
    expect(pythonPackageCommand("pip install -r requirements.txt", "requests\n")?.requirements).toBe("requests\n");
    expect(pythonPackageCommand("python main.py", "")).toBeNull();
  });
  it("rejects unsupported commands, remote packages and flags", () => {
    for (const source of ["pip install --user requests", "pip install https://evil.test/pkg.whl", "pip uninstall requests", "pip install -r other.txt"]) {
      expect(() => pythonPackageCommand(source, "")).toThrow();
    }
    expect(() => pythonRequirements("a\n".repeat(17))).toThrow();
  });
});

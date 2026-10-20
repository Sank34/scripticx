import { describe, expect, it } from "vitest";
import { readAuthFormCredentials } from "./auth-form";

describe("native authentication form values", () => {
  it("reads browser-filled credentials without relying on React change events", () => {
    const data = new FormData();
    data.set("email", "  autofill@example.test  ");
    data.set("password", " secret with spaces ");
    expect(readAuthFormCredentials(data)).toEqual({ email: "autofill@example.test", password: " secret with spaces ", username: "" });
  });

  it("reads the latest values and registration username, preserving the password verbatim", () => {
    const data = new FormData();
    data.set("email", "first@example.test");
    data.set("email", "latest@example.test");
    data.set("password", "parolă🔒");
    data.set("username", "  tester  ");
    expect(readAuthFormCredentials(data)).toEqual({ email: "latest@example.test", password: "parolă🔒", username: "tester" });
  });

  it("treats missing or non-text form values as empty", () => {
    const data = new FormData();
    data.set("email", new Blob(["not an email"]), "upload.txt");
    expect(readAuthFormCredentials(data)).toEqual({ email: "", password: "", username: "" });
  });
});

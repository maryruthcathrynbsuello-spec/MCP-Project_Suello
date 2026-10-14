import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { resolveSafe, SandboxError } from "../src/security/sandbox.js";
import { WORKSPACE_ROOT } from "../src/config/config.js";

test("allows a normal file", async () => {
  assert.equal(await resolveSafe("notes.txt"), path.join(WORKSPACE_ROOT, "notes.txt"));
});

test("allows a nested path", async () => {
  assert.equal(await resolveSafe("a/b/c.txt"), path.join(WORKSPACE_ROOT, "a", "b", "c.txt"));
});

test("allows .. that stays inside", async () => {
  assert.equal(await resolveSafe("folder/../ok.txt"), path.join(WORKSPACE_ROOT, "ok.txt"));
});

const attacks = [
  "../secret.txt",
  "../../etc/passwd",
  "..\\..\\Windows\\win.ini",
  "folder/../../escape.txt",
  "../workspace-evil/x.txt",
  "C:\\Windows\\win.ini",
  "/etc/passwd",
  "bad\0name.txt",
  ".git/config",
  ".GIT/hooks/pre-commit",
  "notes/.git/config",
  "GIT~1/config",
  "notes.txt:hidden",
];

for (const attack of attacks) {
  test(`rejects ${JSON.stringify(attack)}`, async () => {
    await assert.rejects(() => resolveSafe(attack), SandboxError);
  });
}
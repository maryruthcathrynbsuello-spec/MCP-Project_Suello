import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { guardAppendOnly, guardNotCritical } from "../src/security/guards.js";
import { SandboxError } from "../src/security/sandbox.js";
import { WORKSPACE_ROOT } from "../src/config/config.js";

const p = (...parts: string[]) => path.join(WORKSPACE_ROOT, ...parts);

test("append-only logs are protected", () => {
  for (const f of ["PLAN_LOG.md", "CHECKPOINTS.md", "DECISIONS.md"]) {
    assert.throws(() => guardAppendOnly(p("handoff", f), "write_file"), SandboxError);
  }
});

test("protection ignores letter case", () => {
  assert.throws(() => guardAppendOnly(p("handoff", "plan_log.md"), "write_file"), SandboxError);
});

test("PROJECT_STATE.md and normal files stay editable", () => {
  assert.doesNotThrow(() => guardAppendOnly(p("handoff", "PROJECT_STATE.md"), "write_file"));
  assert.doesNotThrow(() => guardAppendOnly(p("notes.txt"), "write_file"));
});

test("critical folders cannot be deleted", () => {
  const cases: string[][] = [[], ["handoff"], [".trash"]];
  for (const parts of cases) {
    assert.throws(() => guardNotCritical(p(...parts), "delete_file"), SandboxError);
  }
});

test("ordinary files can be deleted", () => {
  assert.doesNotThrow(() => guardNotCritical(p("notes.txt"), "delete_file"));
});
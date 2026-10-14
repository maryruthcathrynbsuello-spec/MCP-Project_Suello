import path from "node:path";
import { WORKSPACE_ROOT } from "../config/config.js";
import { SandboxError } from "./sandbox.js";

export const HANDOFF_DIR = "handoff";
export const APPEND_ONLY_FILES = ["PLAN_LOG.md", "CHECKPOINTS.md", "DECISIONS.md"];

function rel(full: string): string {
  return path.relative(WORKSPACE_ROOT, full).split(path.sep).join("/").toLowerCase();
}

export function guardAppendOnly(full: string, action: string): void {
  const r = rel(full);
  if (APPEND_ONLY_FILES.some((f) => r === `${HANDOFF_DIR}/${f.toLowerCase()}`)) {
    throw new SandboxError(
      `Blocked: ${action} on ${r} is not allowed because this log is append-only. Use append_handoff.`
    );
  }
}

export function guardNotCritical(full: string, action: string): void {
  const r = rel(full);
  if (r === "" || r === HANDOFF_DIR || r === ".trash") {
    throw new SandboxError(`Blocked: ${action} on "${r || "workspace root"}" is not allowed.`);
  }
}
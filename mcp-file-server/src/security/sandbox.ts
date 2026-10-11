import fs from "node:fs/promises";
import path from "node:path";
import { WORKSPACE_ROOT } from "../config/config.js";

export class SandboxError extends Error {}

function isInside(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  if (rel === "") return true; // the root itself
  if (path.isAbsolute(rel)) return false; // different drive
  return rel !== ".." && !rel.startsWith(".." + path.sep);
}

/**
 * Turns a path from the AI into a real path inside the workspace.
 * Throws SandboxError if the path would land anywhere else.
 */
export async function resolveSafe(userPath: string): Promise<string> {
  if (userPath.includes("\0")) {
    throw new SandboxError("Invalid path: contains a null character.");
  }

  await fs.mkdir(WORKSPACE_ROOT, { recursive: true });

  // Check 1: the path as written, resolved against the workspace root
  const full = path.resolve(WORKSPACE_ROOT, userPath);
  if (!isInside(WORKSPACE_ROOT, full)) {
    throw new SandboxError(
      `Access denied: "${userPath}" is outside the workspace. Use a path relative to the workspace root, like "notes/todo.txt".`
    );
  }

  // Check 2: shortcuts (symlinks) must not point outside either.
  // Find the nearest part of the path that exists and resolve its real location.
  const realRoot = await fs.realpath(WORKSPACE_ROOT);
  let probe = full;
  for (;;) {
    try {
      const real = await fs.realpath(probe);
      if (!isInside(realRoot, real)) {
        throw new SandboxError(`Access denied: "${userPath}" points outside the workspace.`);
      }
      break;
    } catch (err) {
      if (err instanceof SandboxError) throw err;
      const parent = path.dirname(probe);
      if (parent === probe) break;
      probe = parent;
    }
  }

  return full;
}
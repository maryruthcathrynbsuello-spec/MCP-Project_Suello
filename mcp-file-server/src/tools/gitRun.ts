import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { WORKSPACE_ROOT } from "../config/config.js";
import { fail, toError } from "./helpers.js";

export class GitError extends Error {}

export function runGit(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      args,
      { cwd: WORKSPACE_ROOT, timeout: 15000, maxBuffer: 1024 * 1024, windowsHide: true },
      (err, stdout, stderr) => {
        if (err) {
          if ((err as NodeJS.ErrnoException).code === "ENOENT") {
            return reject(new GitError("Git is not installed or not on the server's PATH."));
          }
          const text = (String(stderr) || String(stdout) || err.message).trim().slice(0, 500);
          return reject(new GitError(text));
        }
        resolve(String(stdout));
      }
    );
  });
}

export async function hasRepo(): Promise<boolean> {
  try {
    await fs.access(path.join(WORKSPACE_ROOT, ".git"));
    return true;
  } catch {
    return false;
  }
}

export async function ensureRepo(): Promise<void> {
  await fs.mkdir(WORKSPACE_ROOT, { recursive: true });
  if (await hasRepo()) return;
  await runGit(["init"]);
  await fs.writeFile(path.join(WORKSPACE_ROOT, ".gitignore"), ".trash/\n", { flag: "wx" }).catch(() => {});
}

export function gitFail(err: unknown) {
  return err instanceof GitError ? fail(err.message) : toError(err);
}
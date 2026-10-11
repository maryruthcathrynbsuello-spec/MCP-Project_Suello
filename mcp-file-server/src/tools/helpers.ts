import { SandboxError } from "../security/sandbox.js";

export const ok = (text: string) => ({
  content: [{ type: "text" as const, text }],
});

export const fail = (text: string) => ({
  isError: true as const,
  content: [{ type: "text" as const, text }],
});

export function toError(err: unknown) {
  if (err instanceof SandboxError) return fail(err.message);
  const code = (err as NodeJS.ErrnoException).code;
  if (code === "ENOENT") return fail("Not found. Use list_files to see what exists.");
  if (code === "EISDIR") return fail("That path is a folder, not a file.");
  if (code === "ENOTDIR") return fail("Part of that path is a file, not a folder.");
  return fail(`Operation failed (${code ?? "unknown error"}).`);
}
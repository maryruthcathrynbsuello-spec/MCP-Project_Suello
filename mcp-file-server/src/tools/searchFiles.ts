import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WORKSPACE_ROOT } from "../config/config.js";
import { resolveSafe } from "../security/sandbox.js";
import { audit } from "../security/audit.js";
import { ok, fail, toError } from "./helpers.js";

const MAX_RESULTS = 50;

async function* walk(dir: string): AsyncGenerator<string> {
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.name === ".trash") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (e.isFile()) yield p; // symlinks are skipped on purpose
  }
}

export function registerSearchFiles(server: McpServer) {
  server.registerTool(
    "search_files",
    {
      title: "Search files",
      description:
        "Case-insensitive search of file names and file contents (text files). Returns up to 50 matches as 'path:line: text'. Use this before read_file on big workspaces.",
      inputSchema: {
        query: z.string().min(1).describe("Text to look for"),
        path: z.string().default(".").describe("Folder to search in, relative to the workspace root"),
      },
    },
    async ({ query, path: relPath }) => {
      audit("search_files", { query, path: relPath });
      try {
        const start = await resolveSafe(relPath);
        if (!(await fs.stat(start)).isDirectory()) return fail("Search path must be a folder.");
        const q = query.toLowerCase();
        const results: string[] = [];
        for await (const file of walk(start)) {
          if (results.length >= MAX_RESULTS) break;
          const rel = path.relative(WORKSPACE_ROOT, file);
          if (rel.toLowerCase().includes(q)) results.push(`${rel}  (name match)`);
          if ((await fs.stat(file)).size > 1_000_000) continue;
          const buf = await fs.readFile(file);
          if (buf.includes(0)) continue; // binary file
          const lines = buf.toString("utf8").split("\n");
          for (let i = 0; i < lines.length && results.length < MAX_RESULTS; i++) {
            if (lines[i].toLowerCase().includes(q)) {
              results.push(`${rel}:${i + 1}: ${lines[i].trim().slice(0, 120)}`);
            }
          }
        }
        return ok(results.length ? results.join("\n") : "No matches.");
      } catch (err) {
        return toError(err);
      }
    }
  );
}
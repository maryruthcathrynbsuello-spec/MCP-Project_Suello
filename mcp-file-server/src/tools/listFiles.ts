import fs from "node:fs/promises";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { resolveSafe } from "../security/sandbox.js";
import { audit } from "../security/audit.js";
import { ok, toError } from "./helpers.js";

export function registerListFiles(server: McpServer) {
  server.registerTool(
    "list_files",
    {
      title: "List files",
      description:
        "List files and folders inside one workspace folder (not recursive). Use path '.' for the top level.",
      inputSchema: {
        path: z.string().default(".").describe("Folder relative to the workspace root, e.g. '.' or 'notes'"),
      },
    },
    async ({ path: relPath }) => {
      audit("list_files", { path: relPath });
      try {
        const dir = await resolveSafe(relPath);
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const lines = entries.map((e) => (e.isDirectory() ? `[dir]  ${e.name}` : `[file] ${e.name}`));
        return ok(lines.length ? lines.join("\n") : "(folder is empty)");
      } catch (err) {
        return toError(err);
      }
    }
  );
}
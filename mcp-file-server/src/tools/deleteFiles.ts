import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WORKSPACE_ROOT } from "../config/config.js";
import { resolveSafe } from "../security/sandbox.js";
import { audit } from "../security/audit.js";
import { ok, fail, toError } from "./helpers.js";

export function registerDeleteFile(server: McpServer) {
  server.registerTool(
    "delete_file",
    {
      title: "Delete file or folder",
      description:
        "Move a file or folder to the workspace .trash folder (recoverable). Requires confirm=true.",
      inputSchema: {
        path: z.string().describe("Path relative to the workspace root"),
        confirm: z.boolean().default(false).describe("Must be true to proceed"),
      },
    },
    async ({ path: relPath, confirm }) => {
      audit("delete_file", { path: relPath, confirm });
      try {
        if (!confirm) {
          return fail("Deleting requires confirm=true. The item is moved to .trash/, not erased permanently.");
        }
        const full = await resolveSafe(relPath);
        if (path.resolve(full) === path.resolve(WORKSPACE_ROOT)) {
          return fail("Cannot delete the workspace root.");
        }
        const trash = path.join(WORKSPACE_ROOT, ".trash");
        await fs.mkdir(trash, { recursive: true });
        const dest = `${Date.now()}-${path.basename(full)}`;
        await fs.rename(full, path.join(trash, dest));
        return ok(`Moved ${relPath} to .trash/${dest}`);
      } catch (err) {
        return toError(err);
      }
    }
  );
}
import fs from "node:fs/promises";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { resolveSafe } from "../security/sandbox.js";
import { audit } from "../security/audit.js";
import { ok, toError } from "./helpers.js";

export function registerCreateFolder(server: McpServer) {
  server.registerTool(
    "create_folder",
    {
      title: "Create folder",
      description: "Create a folder (and any missing parent folders) inside the workspace.",
      inputSchema: {
        path: z.string().describe("Folder path relative to the workspace root, e.g. 'projects/week1'"),
      },
    },
    async ({ path: relPath }) => {
      audit("create_folder", { path: relPath });
      try {
        const full = await resolveSafe(relPath);
        await fs.mkdir(full, { recursive: true });
        return ok(`Folder ready: ${relPath}`);
      } catch (err) {
        return toError(err);
      }
    }
  );
}
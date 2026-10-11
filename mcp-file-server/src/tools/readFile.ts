import fs from "node:fs/promises";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { resolveSafe } from "../security/sandbox.js";
import { audit } from "../security/audit.js";
import { ok, fail, toError } from "./helpers.js";

const MAX_BYTES = 5 * 1024 * 1024;

export function registerReadFile(server: McpServer) {
  server.registerTool(
    "read_file",
    {
      title: "Read file",
      description:
        "Read a text file in chunks. Returns up to 'length' characters starting at 'offset' and tells you the next offset. Text files only.",
      inputSchema: {
        path: z.string().describe("File path relative to the workspace root"),
        offset: z.number().int().min(0).default(0).describe("Character to start from"),
        length: z.number().int().min(1).max(20000).default(5000).describe("Max characters to return"),
      },
    },
    async ({ path: relPath, offset, length }) => {
      audit("read_file", { path: relPath, offset, length });
      try {
        const full = await resolveSafe(relPath);
        const stat = await fs.stat(full);
        if (stat.isDirectory()) return fail("That path is a folder. Use list_files instead.");
        if (stat.size > MAX_BYTES) return fail("File is larger than 5 MB. Use search_files to find the part you need.");
        const text = await fs.readFile(full, "utf8");
        const end = Math.min(offset + length, text.length);
        const note =
          end < text.length
            ? `[chars ${offset}-${end} of ${text.length}. Call again with offset=${end} for more.]`
            : `[chars ${offset}-${end} of ${text.length}. End of file.]`;
        return ok(text.slice(offset, end) + "\n\n" + note);
      } catch (err) {
        return toError(err);
      }
    }
  );
}
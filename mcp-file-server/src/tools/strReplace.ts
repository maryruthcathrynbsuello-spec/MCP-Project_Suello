import fs from "node:fs/promises";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { resolveSafe } from "../security/sandbox.js";
import { audit } from "../security/audit.js";
import { ok, fail, toError } from "./helpers.js";

export function registerStrReplace(server: McpServer) {
  server.registerTool(
    "str_replace",
    {
      title: "Replace text in file",
      description:
        "Replace one exact piece of text in a file with new text. old_str must appear exactly once.",
      inputSchema: {
        path: z.string().describe("File path relative to the workspace root"),
        old_str: z.string().min(1).describe("Exact text to find (must be unique in the file)"),
        new_str: z.string().describe("Replacement text (can be empty to delete)"),
      },
    },
    async ({ path: relPath, old_str, new_str }) => {
      audit("str_replace", { path: relPath });
      try {
        const full = await resolveSafe(relPath);
        const text = await fs.readFile(full, "utf8");
        const count = text.split(old_str).length - 1;
        if (count === 0) return fail("old_str was not found. Use read_file to check the exact text.");
        if (count > 1) return fail(`old_str appears ${count} times. Include more surrounding text so it is unique.`);
        const i = text.indexOf(old_str);
        await fs.writeFile(full, text.slice(0, i) + new_str + text.slice(i + old_str.length), "utf8");
        return ok(`Replaced 1 occurrence in ${relPath}`);
      } catch (err) {
        return toError(err);
      }
    }
  );
}
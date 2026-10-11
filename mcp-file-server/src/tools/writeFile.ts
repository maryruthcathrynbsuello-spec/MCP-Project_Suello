import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { resolveSafe } from "../security/sandbox.js";
import { audit } from "../security/audit.js";
import { ok, fail, toError } from "./helpers.js";

export function registerWriteFile(server: McpServer) {
  server.registerTool(
    "write_file",
    {
      title: "Write file",
      description:
        "Create a text file (.txt, .md, .json, .csv, code, etc.) with the given content. Fails if the file exists unless overwrite=true. Missing folders are created. For Word files use write_docx.",
      inputSchema: {
        path: z.string().describe("File path relative to the workspace root, e.g. 'notes.txt'"),
        content: z.string().describe("Full text content of the file"),
        overwrite: z.boolean().default(false).describe("Set true to replace an existing file"),
      },
    },
    async ({ path: relPath, content, overwrite }) => {
      audit("write_file", { path: relPath, chars: content.length, overwrite });
      try {
        const full = await resolveSafe(relPath);
        await fs.mkdir(path.dirname(full), { recursive: true });
        try {
          await fs.writeFile(full, content, { encoding: "utf8", flag: overwrite ? "w" : "wx" });
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === "EEXIST") {
            return fail(`"${relPath}" already exists. Set overwrite=true to replace it, or pick another name.`);
          }
          throw err;
        }
        return ok(`Wrote ${content.length} characters to ${relPath}`);
      } catch (err) {
        return toError(err);
      }
    }
  );
}
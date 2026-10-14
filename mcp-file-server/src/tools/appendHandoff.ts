import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WORKSPACE_ROOT } from "../config/config.js";
import { HANDOFF_DIR } from "../security/guards.js";
import { audit } from "../security/audit.js";
import { ok, fail, toError } from "./helpers.js";

const MAX_LOG_BYTES = 200_000;

export function registerAppendHandoff(server: McpServer) {
  server.registerTool(
    "append_handoff",
    {
      title: "Append to a handoff log",
      description:
        "Add a timestamped entry to PLAN_LOG, CHECKPOINTS or DECISIONS. Append-only: nothing is overwritten. Keep entries short (max 2000 characters). PROJECT_STATE.md is edited with str_replace instead.",
      inputSchema: {
        file: z.enum(["PLAN_LOG", "CHECKPOINTS", "DECISIONS"]).describe("Which log to append to"),
        entry: z.string().min(1).max(2000).describe("The entry text"),
        author: z.string().max(40).default("agent").describe("Who is writing, e.g. 'claude-session-2'"),
      },
    },
    async ({ file, entry, author }) => {
      audit("append_handoff", { file, author, chars: entry.length });
      try {
        const full = path.join(WORKSPACE_ROOT, HANDOFF_DIR, `${file}.md`);
        const stat = await fs.stat(full).catch((e: NodeJS.ErrnoException) => {
          if (e.code === "ENOENT") return null;
          throw e;
        });
        if (!stat) return fail("Handoff files not found. Call init_handoff first.");
        if (stat.size > MAX_LOG_BYTES) {
          return fail(`${file}.md is over 200 KB. Summarise old entries into a new file and start a fresh log.`);
        }
        const block = `\n## ${new Date().toISOString()} | ${author.replace(/[\r\n]+/g, " ")}\n${entry.trim()}\n`;
        await fs.appendFile(full, block, "utf8");
        return ok(`Appended to ${file}.md (${block.length} characters).`);
      } catch (err) {
        return toError(err);
      }
    }
  );
}
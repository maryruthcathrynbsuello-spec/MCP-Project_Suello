import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WORKSPACE_ROOT } from "../config/config.js";
import { HANDOFF_DIR } from "../security/guards.js";
import { audit } from "../security/audit.js";
import { ok, toError } from "./helpers.js";

function templates(project: string, goal: string): Record<string, string> {
  const now = new Date().toISOString();
  return {
    "PROJECT_STATE.md": `# PROJECT_STATE\n\n**Project:** ${project}\n**Goal:** ${goal}\n**Last updated:** ${now}\n\n## Current status\nNot started.\n\n## Next steps\n1. (fill in)\n\n## Open questions\n- none\n\n> Edit this file with str_replace and keep it short. A new session reads it first.\n`,
    "PLAN_LOG.md": "# PLAN_LOG\n\nAppend-only. One short entry per plan or change of plan. Use append_handoff.\n",
    "CHECKPOINTS.md": "# CHECKPOINTS\n\nAppend-only. At the end of a session, record what is done and verified.\n",
    "DECISIONS.md": "# DECISIONS\n\nAppend-only. Record each decision and the reason for it.\n",
  };
}

export function registerInitHandoff(server: McpServer) {
  server.registerTool(
    "init_handoff",
    {
      title: "Set up handoff files",
      description:
        "Create handoff/PROJECT_STATE.md, PLAN_LOG.md, CHECKPOINTS.md and DECISIONS.md. Never overwrites existing files, so it is safe to call at the start of any session.",
      inputSchema: {
        project_name: z.string().max(100).default("Untitled project").describe("Short project name"),
        goal: z.string().max(500).default("Not set yet").describe("One-sentence goal"),
      },
    },
    async ({ project_name, goal }) => {
      audit("init_handoff", {});
      try {
        const dir = path.join(WORKSPACE_ROOT, HANDOFF_DIR);
        await fs.mkdir(dir, { recursive: true });
        const created: string[] = [];
        const kept: string[] = [];
        for (const [name, text] of Object.entries(templates(project_name, goal))) {
          try {
            await fs.writeFile(path.join(dir, name), text, { encoding: "utf8", flag: "wx" });
            created.push(name);
          } catch (err) {
            if ((err as NodeJS.ErrnoException).code === "EEXIST") kept.push(name);
            else throw err;
          }
        }
        return ok(
          `Handoff ready in ${HANDOFF_DIR}/. Created: ${created.join(", ") || "none"}. Kept existing: ${kept.join(", ") || "none"}. Next: read ${HANDOFF_DIR}/PROJECT_STATE.md.`
        );
      } catch (err) {
        return toError(err);
      }
    }
  );
}
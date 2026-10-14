import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { audit } from "../security/audit.js";
import { ok } from "./helpers.js";
import { runGit, hasRepo, gitFail, GitError } from "./gitRun.js";

export function registerGitLog(server: McpServer) {
  server.registerTool(
    "git_log",
    {
      title: "Git log",
      description: "Show recent commits in the workspace repository, one line each. Read-only.",
      inputSchema: {
        count: z.number().int().min(1).max(50).default(10).describe("How many commits to show"),
      },
    },
    async ({ count }) => {
      audit("git_log", { count });
      try {
        if (!(await hasRepo())) return ok("No git repository yet. git_commit will create one.");
        const out = (await runGit(["log", "--oneline", "--no-decorate", "-n", String(count)])).trim();
        return ok(out || "No commits yet.");
      } catch (err) {
        if (err instanceof GitError && /does not have any commits/i.test(err.message)) {
          return ok("No commits yet.");
        }
        return gitFail(err);
      }
    }
  );
}
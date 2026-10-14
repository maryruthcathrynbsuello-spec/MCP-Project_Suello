import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { audit } from "../security/audit.js";
import { ok } from "./helpers.js";
import { runGit, hasRepo, gitFail } from "./gitRun.js";

export function registerGitStatus(server: McpServer) {
  server.registerTool(
    "git_status",
    {
      title: "Git status",
      description: "Show new and changed files in the workspace git repository (short format). Read-only.",
      inputSchema: {},
    },
    async () => {
      audit("git_status");
      try {
        if (!(await hasRepo())) return ok("No git repository yet. git_commit will create one.");
        const out = (await runGit(["status", "--short", "--branch"])).trim();
        return ok(out || "(clean)");
      } catch (err) {
        return gitFail(err);
      }
    }
  );
}
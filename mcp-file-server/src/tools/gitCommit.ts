import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { audit } from "../security/audit.js";
import { ok } from "./helpers.js";
import { runGit, ensureRepo, gitFail, GitError } from "./gitRun.js";

export function registerGitCommit(server: McpServer) {
  server.registerTool(
    "git_commit",
    {
      title: "Git commit",
      description:
        "Save all current workspace changes as one commit with the given message. Creates the repository on first use. Does nothing if there are no changes.",
      inputSchema: {
        message: z.string().min(1).max(200).describe("Short commit message describing the change"),
      },
    },
    async ({ message }) => {
      audit("git_commit", { chars: message.length });
      try {
        await ensureRepo();
        await runGit(["add", "-A"]);
        try {
          await runGit([
            "-c", "user.name=MCP Agent",
            "-c", "user.email=agent@mcp.local",
            "-c", "commit.gpgsign=false",
            "commit", "--no-verify", "-m", message,
          ]);
        } catch (err) {
          if (err instanceof GitError && /nothing to commit|no changes added/i.test(err.message)) {
            return ok("Nothing to commit. The workspace is clean.");
          }
          throw err;
        }
        const hash = (await runGit(["rev-parse", "--short", "HEAD"])).trim();
        return ok(`Committed ${hash}: ${message}`);
      } catch (err) {
        return gitFail(err);
      }
    }
  );
}
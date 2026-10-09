import fs from "node:fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WORKSPACE_ROOT } from "../config/config.js";

export function registerListFiles(server: McpServer) {
  server.registerTool(
    "list_files",
    {
      title: "List files",
      description:
        "List the files and folders at the top level of the workspace. Takes no input.",
      inputSchema: {},
    },
    async () => {
      try {
        await fs.mkdir(WORKSPACE_ROOT, { recursive: true });
        const entries = await fs.readdir(WORKSPACE_ROOT, { withFileTypes: true });
        const lines = entries.map((e) =>
          e.isDirectory() ? `[dir]  ${e.name}` : `[file] ${e.name}`
        );
        return {
          content: [
            { type: "text", text: lines.length ? lines.join("\n") : "(workspace is empty)" },
          ],
        };
      } catch (err) {
        return {
          isError: true,
          content: [{ type: "text", text: `Could not list workspace: ${(err as Error).message}` }],
        };
      }
    }
  );
}
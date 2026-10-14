import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { PORT, HOST, MCP_TOKEN, WORKSPACE_ROOT } from "../config/config.js";
import { requireToken } from "../security/auth.js";
import { registerListFiles } from "../tools/listFiles.js";
import { registerReadFile } from "../tools/readFile.js";
import { registerWriteFile } from "../tools/writeFile.js";
import { registerStrReplace } from "../tools/strReplace.js";
import { registerDeleteFile } from "../tools/deleteFiles.js";
import { registerCreateFolder } from "../tools/createFolder.js";
import { registerSearchFiles } from "../tools/searchFiles.js";
import { registerWriteDocx } from "../tools/writeDocx.js";
import { registerInitHandoff } from "../tools/initHandoff.js";
import { registerAppendHandoff } from "../tools/appendHandoff.js";
import { registerGitStatus } from "../tools/gitStatus.js";
import { registerGitCommit } from "../tools/gitCommit.js";
import { registerGitLog } from "../tools/gitLog.js";

// Fail closed: never start an open server by accident.
if (MCP_TOKEN.length < 32) {
  console.error("MCP_TOKEN is missing or shorter than 32 characters. Set it in .env. Not starting.");
  process.exit(1);
}

const INSTRUCTIONS = `Sandboxed workspace file server. Session protocol:
1. At the start call init_handoff (safe, never overwrites), then read handoff/PROJECT_STATE.md and the latest entries of PLAN_LOG.md and CHECKPOINTS.md.
2. Before acting, append a short plan to PLAN_LOG with append_handoff. Record decisions in DECISIONS.
3. Prefer search_files and chunked read_file over reading whole files. Batch independent calls. Do not retry a failed call with the same input.
4. At the end: update PROJECT_STATE.md with str_replace, append a CHECKPOINT, then git_commit.
The logs are append-only; never try to overwrite them.`;

function buildServer() {
  const server = new McpServer({ name: "my-file-server", version: "0.4.0" }, { instructions: INSTRUCTIONS });
  registerListFiles(server);
  registerReadFile(server);
  registerWriteFile(server);
  registerStrReplace(server);
  registerDeleteFile(server);
  registerCreateFolder(server);
  registerSearchFiles(server);
  registerWriteDocx(server);
  registerInitHandoff(server);
  registerAppendHandoff(server);
  registerGitStatus(server);
  registerGitCommit(server);
  registerGitLog(server);
  return server;
}

const app = express();
app.use(express.json({ limit: "2mb" }));

const MCP_PATHS = ["/mcp", "/mcp/:token"];

app.post(MCP_PATHS, requireToken, async (req, res) => {
  try {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("Request failed:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

const notAllowed = (_req: express.Request, res: express.Response) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed." },
    id: null,
  });
};
app.get(MCP_PATHS, requireToken, notAllowed);
app.delete(MCP_PATHS, requireToken, notAllowed);

app.listen(PORT, HOST, () => {
  console.log(`MCP server running at http://${HOST}:${PORT}/mcp`);
  console.log(`Workspace root: ${WORKSPACE_ROOT}`);
});
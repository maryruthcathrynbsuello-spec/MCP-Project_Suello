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

// Fail closed: never start an open server by accident.
if (MCP_TOKEN.length < 32) {
  console.error("MCP_TOKEN is missing or shorter than 32 characters. Set it in .env. Not starting.");
  process.exit(1);
}

function buildServer() {
  const server = new McpServer({ name: "my-file-server", version: "0.3.0" });
  registerListFiles(server);
  registerReadFile(server);
  registerWriteFile(server);
  registerStrReplace(server);
  registerDeleteFile(server);
  registerCreateFolder(server);
  registerSearchFiles(server);
  registerWriteDocx(server);
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

// HOST=127.0.0.1 means only this computer (and the tunnel) can reach the server, not your Wi-Fi network.
app.listen(PORT, HOST, () => {
  console.log(`MCP server running at http://${HOST}:${PORT}/mcp`);
  console.log(`Workspace root: ${WORKSPACE_ROOT}`);
});
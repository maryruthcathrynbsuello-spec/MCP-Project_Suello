import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { PORT, WORKSPACE_ROOT } from "../config/config.js";
import { registerListFiles } from "../tools/listFiles.js";

function buildServer() {
  const server = new McpServer({ name: "my-file-server", version: "0.1.0" });
  registerListFiles(server);
  return server;
}

const app = express();
app.use(express.json());

// Each request gets a fresh server + transport (stateless mode: simple and robust).
app.post("/mcp", async (req, res) => {
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
app.get("/mcp", notAllowed);
app.delete("/mcp", notAllowed);

app.listen(PORT, () => {
  console.log(`MCP server running at http://localhost:${PORT}/mcp`);
  console.log(`Workspace root: ${WORKSPACE_ROOT}`);
});
import "dotenv/config";
import path from "node:path";

export const PORT = Number(process.env.PORT ?? 3000);
export const HOST = process.env.HOST ?? "127.0.0.1";
export const MCP_TOKEN = process.env.MCP_TOKEN ?? "";

// The ONLY folder the AI will be allowed to touch.
export const WORKSPACE_ROOT = path.resolve(process.env.WORKSPACE_ROOT ?? "./workspace");
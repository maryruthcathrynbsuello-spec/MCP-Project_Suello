import fs from "node:fs";
import path from "node:path";

const LOG_DIR = path.resolve("./logs");

export function audit(tool: string, details: Record<string, unknown> = {}) {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const line = JSON.stringify({ time: new Date().toISOString(), tool, ...details });
    fs.appendFileSync(path.join(LOG_DIR, "audit.log"), line + "\n");
  } catch {
    // logging must never crash the server
  }
}
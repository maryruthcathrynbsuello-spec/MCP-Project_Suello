import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { MCP_TOKEN } from "../config/config.js";
import { audit } from "./audit.js";

// Compare hashes so the check takes the same time whether or not the guess is close.
function same(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function requireToken(req: Request, res: Response, next: NextFunction) {
  const header = req.get("authorization") ?? "";
  const fromHeader = header.startsWith("Bearer ") ? header.slice(7) : "";
  const fromPath = typeof req.params.token === "string" ? req.params.token : "";
  const supplied = fromHeader || fromPath;

  if (supplied && same(supplied, MCP_TOKEN)) return next();

  audit("auth_denied", { method: req.method, from: req.get("x-forwarded-for") ?? req.ip });
  res.status(401).json({
    jsonrpc: "2.0",
    error: { code: -32001, message: "Unauthorized" },
    id: null,
  });
}
import path from "node:path";

export const PORT = Number(process.env.PORT ?? 3000);

// The ONLY folder the AI will be allowed to touch.
export const WORKSPACE_ROOT = path.resolve(process.env.WORKSPACE_ROOT ?? "./workspace");
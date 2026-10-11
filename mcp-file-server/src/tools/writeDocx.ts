import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { resolveSafe } from "../security/sandbox.js";
import { audit } from "../security/audit.js";
import { ok, fail, toError } from "./helpers.js";

export function registerWriteDocx(server: McpServer) {
  server.registerTool(
    "write_docx",
    {
      title: "Write Word document",
      description:
        "Create a Word (.docx) file from a title and a list of paragraphs. Fails if the file exists unless overwrite=true.",
      inputSchema: {
        path: z.string().describe("Path ending in .docx, e.g. 'report.docx'"),
        title: z.string().optional().describe("Optional title shown at the top"),
        paragraphs: z.array(z.string()).min(1).describe("Paragraph texts, in order"),
        overwrite: z.boolean().default(false).describe("Set true to replace an existing file"),
      },
    },
    async ({ path: relPath, title, paragraphs, overwrite }) => {
      audit("write_docx", { path: relPath, paragraphs: paragraphs.length, overwrite });
      try {
        if (!relPath.toLowerCase().endsWith(".docx")) return fail("Path must end with .docx");
        const full = await resolveSafe(relPath);
        const children: Paragraph[] = [];
        if (title) children.push(new Paragraph({ text: title, heading: HeadingLevel.TITLE }));
        for (const p of paragraphs) children.push(new Paragraph({ children: [new TextRun(p)] }));
        const buffer = await Packer.toBuffer(new Document({ sections: [{ children }] }));
        await fs.mkdir(path.dirname(full), { recursive: true });
        try {
          await fs.writeFile(full, buffer, { flag: overwrite ? "w" : "wx" });
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code === "EEXIST") {
            return fail(`"${relPath}" already exists. Set overwrite=true to replace it.`);
          }
          throw err;
        }
        return ok(`Created Word document ${relPath}`);
      } catch (err) {
        return toError(err);
      }
    }
  );
}
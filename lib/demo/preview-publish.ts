import "server-only";

import fs from "fs/promises";
import path from "path";

let cachedHtml: string | null = null;

const PUBLIC_INDEX = path.join(process.cwd(), "public/demo-app/index.html");

/** Persist Gemini preview.html for /demo (memory + public/demo-app when writable). */
export async function publishDemoPreview(html: string): Promise<void> {
  const trimmed = html.trim();
  if (!trimmed) return;
  cachedHtml = trimmed;
  try {
    await fs.mkdir(path.dirname(PUBLIC_INDEX), { recursive: true });
    await fs.writeFile(PUBLIC_INDEX, trimmed, "utf8");
  } catch {
    /* read-only FS on some serverless hosts */
  }
}

/** Latest generated preview, if any. */
export async function getPublishedDemoPreview(): Promise<{
  html: string | null;
  source: "generated" | "none";
}> {
  if (cachedHtml) {
    return { html: cachedHtml, source: "generated" };
  }
  try {
    const html = await fs.readFile(PUBLIC_INDEX, "utf8");
    if (html.trim()) {
      cachedHtml = html;
      return { html, source: "generated" };
    }
  } catch {
    /* no file yet */
  }
  return { html: null, source: "none" };
}

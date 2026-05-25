/**
 * Sets `export const dynamic` in app/api route handlers for Next.js segment config.
 * Next requires a string literal (not variables or conditionals).
 *
 * Usage:
 *   node scripts/sync-api-dynamic.mjs          # force-dynamic (local / Vercel)
 *   GITHUB_PAGES=true node scripts/sync-api-dynamic.mjs  # force-static (static export)
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const apiDir = path.join(root, "app", "api");
const mode =
  process.env.GITHUB_PAGES === "true" ? "force-static" : "force-dynamic";
const dynamicLine = `export const dynamic = "${mode}";`;

const dynamicBlockRe =
  /export const dynamic\s*=\s*(?:"force-(?:static|dynamic)"|process\.env\.GITHUB_PAGES[\s\S]*?;)\s*\n/;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (name === "route.ts") patch(full);
  }
}

function patch(file) {
  let src = fs.readFileSync(file, "utf8");
  if (!dynamicBlockRe.test(src)) {
    console.warn(`skip (no dynamic export): ${path.relative(root, file)}`);
    return;
  }
  src = src.replace(dynamicBlockRe, `${dynamicLine}\n`);
  fs.writeFileSync(file, src);
  console.log(`${path.relative(root, file)} → ${mode}`);
}

walk(apiDir);

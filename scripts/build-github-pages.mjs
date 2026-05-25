#!/usr/bin/env node
/**
 * GitHub Pages static export: API route handlers cannot run on static hosting.
 * Temporarily moves app/api aside, builds with GITHUB_PAGES=true, then restores.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const apiDir = path.join(root, "app", "api");
const apiBackup = path.join(root, "app", "_api_server_backup");

function run(cmd, args, env = process.env) {
  const r = spawnSync(cmd, args, { cwd: root, env, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

if (fs.existsSync(apiDir)) {
  fs.renameSync(apiDir, apiBackup);
}

let buildOk = false;
try {
  run("npx", ["next", "build"], { ...process.env, GITHUB_PAGES: "true" });
  buildOk = true;
} finally {
  if (fs.existsSync(apiBackup)) {
    if (fs.existsSync(apiDir)) fs.rmSync(apiDir, { recursive: true, force: true });
    fs.renameSync(apiBackup, apiDir);
  }
}
if (!buildOk) process.exit(1);

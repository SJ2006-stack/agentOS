#!/usr/bin/env node
/** Unit-check env helpers when OpenRouter key is unset (no HTTP server). */
import { createRequire } from "node:module";

process.env.OPENROUTER_API_KEY = "";
process.env.OPENROUTER_KEY = "";

const require = createRequire(import.meta.url);
// Resolve compiled path via tsx register
const { register } = await import("node:module");
const { pathToFileURL } = await import("node:url");
const { dirname, join } = await import("node:path");
const { fileURLToPath } = await import("node:url");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

async function loadTs(rel) {
  const target = join(root, rel);
  const mod = await import(pathToFileURL(target).href);
  return mod;
}

// Use dynamic import with ?tsx if available; fallback duplicate readTrimmedEnv logic
function readTrimmedEnv(name) {
  const raw = process.env[name];
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getOpenRouterApiKey() {
  for (const key of ["OPENROUTER_API_KEY", "OPENROUTER_KEY"]) {
    const value = readTrimmedEnv(key);
    if (value) return value;
  }
  return undefined;
}

const key = getOpenRouterApiKey();
const configured = key !== undefined;
console.log(
  JSON.stringify({
    test: "openrouter-env-empty",
    getOpenRouterApiKey: key ?? null,
    isOpenRouterConfigured: configured,
  })
);
process.exit(configured ? 1 : 0);

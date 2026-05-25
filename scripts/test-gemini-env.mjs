#!/usr/bin/env node
/** Unit-check env helpers when Gemini key is unset (no HTTP server). */
import { readFileSync } from "node:fs";

process.env.GEMINI_API_KEY = "";
process.env.GOOGLE_API_KEY = "";

function readTrimmedEnv(name) {
  const raw = process.env[name];
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getGeminiApiKey() {
  for (const key of ["GEMINI_API_KEY", "GOOGLE_API_KEY"]) {
    const value = readTrimmedEnv(key);
    if (value) return value;
  }
  return undefined;
}

const key = getGeminiApiKey();
const configured = key !== undefined;

console.log(
  JSON.stringify({
    test: "gemini-env-empty",
    getGeminiApiKey: key ?? null,
    isGeminiConfigured: configured,
  })
);

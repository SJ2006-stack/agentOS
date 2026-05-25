#!/usr/bin/env node
/**
 * Smoke-test Gemini-related API routes.
 * Usage: BASE_URL=http://127.0.0.1:3000 node scripts/test-gemini-routes.mjs
 */
const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

const routes = [
  ["GET", "/api/os/verify", null],
  ["POST", "/api/agents/kernel", { prompt: "ping", modelId: "gemini-flash-latest" }],
];

async function hit([method, path, body]) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = (await res.text()).slice(0, 200);
  return { method, path, status: res.status, preview: text };
}

const results = [];
for (const r of routes) {
  try {
    results.push(await hit(r));
  } catch (e) {
    results.push({ route: r[1], error: String(e) });
  }
}
console.log(JSON.stringify({ base: BASE, results }, null, 2));

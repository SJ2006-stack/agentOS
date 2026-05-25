#!/usr/bin/env node
/**
 * Smoke-test OpenRouter-related API routes.
 * Usage: BASE_URL=http://127.0.0.1:3000 node scripts/test-openrouter-routes.mjs
 */
const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS ?? 120_000);

async function hit(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const ct = res.headers.get("content-type") ?? "";
  const text = await res.text();
  const html =
    ct.includes("text/html") || text.trimStart().startsWith("<!DOCTYPE");
  let json = null;
  if (ct.includes("application/json")) {
    try {
      json = JSON.parse(text);
    } catch {
      /* keep null */
    }
  }
  return {
    status: res.status,
    ct,
    html,
    json,
    text: text.slice(0, 280),
  };
}

const cases = [
  ["GET", "/api/os/verify", null],
  ["POST", "/api/agents/kernel", { prompt: "say hi in 3 words" }],
  ["POST", "/api/agents/cpu", { task: "test", step: "PLAN", stream: false }],
  ["POST", "/api/agents/gpu", { taskId: `t-${Date.now()}` }],
  ["POST", "/api/os/command", { command: "status" }],
  ["POST", "/api/os/command", { command: "recall smoke" }],
  ["GET", "/api/openrouter/chat", null],
  ["GET", "/api/agents/kernel", null],
];

let failed = 0;
console.log(`BASE_URL=${BASE}\n`);

for (const [method, path, body] of cases) {
  try {
    const r = await hit(method, path, body);
    const row = {
      method,
      path,
      status: r.status,
      html: r.html,
      contentType: r.ct,
      body: r.json ?? r.text,
    };
    console.log(JSON.stringify(row));
    if (r.html && path.startsWith("/api/")) failed++;
    if (method === "GET" && path === "/api/os/verify" && !r.json) failed++;
  } catch (err) {
    console.log(
      JSON.stringify({ method, path, error: err instanceof Error ? err.message : String(err) })
    );
    failed++;
  }
}

process.exit(failed > 0 ? 1 : 0);

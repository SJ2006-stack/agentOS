# DevFactory OS

Terminal-style OS monitor built with Next.js 15, xterm.js, Google Gemini API, HydraDB, and Supabase Realtime Broadcast.

## Quick start

```bash
cp .env.example .env.local
# Fill GEMINI_API_KEY, HYDRADB_API_KEY, Supabase keys

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the hero landing page, then **Spawn your first agent** to enter the OS at `/os`.

### App routes (`app/`)

| Path | URL | Role |
|------|-----|------|
| `(marketing)/page.tsx` | `/` | Landing |
| `os/page.tsx` | `/os` | DevFactory OS shell |
| `api/os/*` | `/api/os/...` | Command, verify, heartbeat, search, create-agent |
| `api/agents/*` | `/api/agents/...` | Kernel, CPU, GPU, registry |
| `api/hydradb/*` | `/api/hydradb/...` | Tenant boot, memories, recall, verify |

> **GitHub Pages:** builds use `GITHUB_PAGES=true`, which sets `basePath` to `/agentOS` (site URL: `https://<user>.github.io/agentOS/`). Local dev and Vercel deploy serve the app at `/` with no base path.

## Shell commands

| Command | Action |
|---------|--------|
| `submit <task>` | Queue task → CPU pipeline (INTAKE→COMMIT) → GPU workers on DISPATCH |
| `recall <query>` | Recall from HydraDB, stream `[memory]` chunks to terminal |
| `memory stream` | Stream recent operational memory |
| `memory stream <query>` | Stream memory for a specific query |
| `show memory` | Show recent system memory |
| `status` | Kernel + HydraDB connectivity |
| `spawn <n>` | Dispatch GPU worker batch (tool-only unless `GPU_SPAWN_LLM=1`) |
| `spawn agent <id>` | Activate graph/custom agent (LLM only when policy allows) |
| `create agent <name> "<role>"` | Register custom agent in HydraDB (no LLM; spawn separately) |
| `agents` / `list agents` | List builtin + custom agent templates |
| `agent status` | Active agents for current task |
| `kill <agentId>` | Acknowledge agent kill (kernel LLM) |

## Agent graph & HydraDB memory

DevFactory OS uses a **unified agent graph** (`lib/os/agent-graph.ts`): typed templates with fixed system roles, DAG edges, and a shared HydraDB memory hub.

### Graph structure

```text
user.session → kernel.orchestrator → cpu.intake → … → cpu.dispatch → gpu.worker
                                                      ↘ cpu.verify → cpu.commit
io.bus ───────────────────────────────────────────────→ hydradb.memory (hub)
(all agents write/recall through graph memory helpers)
```

Exports: `AGENT_GRAPH`, `getAgentTemplate(id)`, `getDownstreamAgents(id)`.

### HydraDB helpers (`lib/hydradb/memory.ts`)

| Function | Purpose |
|----------|---------|
| `writeAgentMemory(templateId, text, metadata)` | Writes to the template’s `sub_tenant_id` with `infer: false`, `metadata.agent_template`, optional `user_turn_id`, and **forceful relations** to upstream graph nodes for the same `task_id` |
| `writeUserInteraction(command, responseSummary, taskId?)` | Persists shell input under `user.session` before kernel routing |
| `recallGraphContext(query, taskId?)` | Recalls orchestrator + CPU pipeline + user session (+ I/O); used by kernel `recall_all_context` / `stream_memory_to_user` |

### User interaction flow

1. Shell POST `/api/os/command` → `writeUserInteraction` (HydraDB `user.session`) → `os:graph` `node_active` for user + kernel.
2. Kernel routes (`submit`, `recall`, etc.); CPU/GPU steps call `writeAgentMemory` with graph template IDs.
3. Each agent memory links to prior nodes on the same task via HydraDB `relations.cortex_source_ids`.
4. UI **Agent Graph** panel highlights the active node from `os:cpu` + `os:graph` Realtime.

### Memory prefixes

| Prefix | Role |
|--------|------|
| `user.session` | Shell commands and outcomes |
| `kernel.orchestrator` | Main orchestrator |
| `cpu.intake` … `cpu.commit` | CPU pipeline steps |
| `gpu.worker` / `gpu.worker.{id}` | GPU worker template and instances |
| `io.bus` | Persisted I/O summaries (`emit_io` with `persist: true`) |
| `hydradb.memory` | Graph memory hub (boot slot) |

Metadata on each write: `agent_template`, `agent_id`, `pipeline_step`, `task_id`, optional `user_turn_id`.

- `infer: false` — structured operational facts
- `infer: true` — raw dialogue logs only

## LLM layer

**LLM usage is billed to your Google API key** (`GEMINI_API_KEY`, or `GOOGLE_API_KEY`) — track spend in [Google AI Studio](https://aistudio.google.com/) / Google Cloud console.

Gemini is called only when `agentNeedsLlm(templateId, action)` is true in `lib/ai/agent-llm-policy.ts` (not on every tool-only CPU/GPU step). Model: `gemini-flash-latest`. Tool loops use the Gemini `generateContent` API in `lib/ai/gemini-agent.ts`. After each LLM call, the shell may show `[usage] tokens: prompt=X completion=Y` and broadcast `os:kernel` `usage_tick` for the KernelBar.

| Agent / step | spawn | step | recall |
|--------------|-------|------|--------|
| `kernel.orchestrator` | LLM | LLM | LLM |
| `user.session` | — | — | LLM |
| `cpu.intake`, `cpu.plan`, `cpu.verify` | LLM | LLM | — |
| `cpu.route`, `cpu.dispatch`, `cpu.commit` | tool-only | tool-only | — |
| `gpu.worker` | tool-only* | — | — |
| `io.bus`, `hydradb.memory` | tool-only | tool-only | — |
| `custom.*` | LLM | LLM | LLM |

\* Set `GPU_SPAWN_LLM=1` for optional short GPU worker completions on spawn.

## Architecture

- **Kernel** — `/api/agents/kernel` — routes shell, recall tools
- **CPU** — sequential pipeline via `/api/agents/cpu` + `runCpuPipeline`
- **GPU** — parallel workers after DISPATCH (`gpu_dispatch` → `os:gpu`)
- **HydraDB** — `/api/hydradb/*` — tenant boot, add memory, recall
- **Realtime** — Supabase Broadcast on `os:kernel`, `os:cpu`, `os:memory`, `os:io`, `os:gpu`, `os:graph`

## HydraDB API routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/hydradb/verify` | GET | Connectivity check (no key → `configured: false`) |
| `/api/hydradb/tenants/create` | POST | Ensure tenant exists (`HYDRADB_TENANT_ID`) |
| `/api/hydradb/boot` | POST | Seed boot slots for all memory prefixes |
| `/api/hydradb/memories` | POST | `{ sub_tenant_id, text, infer?, metadata? }` — write then `os:memory` broadcast |
| `/api/hydradb/recall` | POST | `{ query, sub_tenant_id?, aggregate? }` — recall then broadcast chunks |

Live-only: all routes return **503** when `HYDRADB_API_KEY` is unset.

## Deploy (Vercel)

1. Push to GitHub and import the repo in [Vercel](https://vercel.com/new), or run:

```bash
npx vercel
```

2. In **Project → Settings → Environment Variables**, add (placeholders only in repo; use real values in Vercel):

| Variable | Required | Notes |
|----------|----------|-------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key — powers all LLM routes (model: `gemini-flash-latest`). `GOOGLE_API_KEY` is accepted as an alias. |
| `HYDRADB_API_KEY` | Yes | Live HydraDB; no mock fallback |
| `HYDRADB_TENANT_ID` | No | Defaults to `agentos` (see `.env.example`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Realtime panels |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client subscribe |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server broadcast only |
| `NEXT_PUBLIC_APP_URL` | No | Production URL for server-side callbacks |
| `DEMO_DEPLOY_URL` | No | URL shown when demo build completes (server); auto-detects `VERCEL_URL` on Vercel |
| `NEXT_PUBLIC_DEMO_DEPLOY_URL` | No | Same URL for client deploy modal; set with `DEMO_DEPLOY_URL` on Vercel |
| `TAVILY_API_KEY` | No | Web search for Researcher create-agent flow (preferred) |
| `SERPER_API_KEY` | No | Web search fallback if Tavily unset |
| `NEXT_PUBLIC_ENABLE_DOOM_DEMO` | No | `1` / `0` — DOOM hero demo; on in dev when unset |

3. Redeploy after env changes. `vercel.json` sets longer `maxDuration` for agent and HydraDB routes.

Never commit real API keys — copy from `.env.example` into `.env.local` or Vercel only.

### Health check (monitoring)

The kernel heartbeat endpoint is used by the shell (`useKernelHeartbeat`) and is suitable for uptime probes:

```bash
# POST (matches shell client poll)
curl -sS -X POST https://<your-host>/api/os/heartbeat
# GET (load balancers that only allow GET)
curl -sS https://<your-host>/api/os/heartbeat
# → {"ok":true,"uptimeMs":<number>}
```

Expect **200** with `ok: true`. On failure, check Vercel function logs and Supabase broadcast credentials. Poll every 30–60s when the OS tab is expected to be active (the client skips polling when the document is hidden).

## Demo script

```text
submit build auth microservice with JWT
status
recall auth preferences
memory stream JWT
show memory
```

Watch CPU steps pulse, GPU heatmap light up on DISPATCH, and Hydra memory panel fill from Realtime.

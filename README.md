# DevFactory OS

Terminal-style OS monitor built with Next.js 15, xterm.js, Vercel AI SDK, HydraDB, and Supabase Realtime Broadcast.

## Quick start

```bash
cp .env.example .env.local
# Fill OPENAI_API_KEY, HYDRADB_API_KEY, Supabase keys

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — full-viewport OS with shell at the bottom.

## Shell commands

| Command | Action |
|---------|--------|
| `submit <task>` | Queue task → CPU pipeline (INTAKE→COMMIT) → GPU workers on DISPATCH |
| `recall <query>` | Recall from HydraDB, stream `[memory]` chunks to terminal |
| `memory stream` | Stream recent operational memory |
| `memory stream <query>` | Stream memory for a specific query |
| `show memory` | Show recent system memory |
| `status` | Kernel + HydraDB connectivity |
| `spawn <n>` | Acknowledge GPU worker spawn |
| `kill <agentId>` | Acknowledge agent kill |

## HydraDB memory prefixes

All agent context is persisted in HydraDB before `os:memory` Realtime events:

| Prefix | Role |
|--------|------|
| `kernel.orchestrator` | Main orchestrator |
| `cpu.intake` … `cpu.commit` | CPU pipeline steps |
| `gpu.worker.{id}` | GPU workers (e.g. `gpu.worker.w003`) |
| `io.bus` | Persisted I/O summaries (`emit_io` with `persist: true`) |

Metadata on each write: `agent_id`, `pipeline_step`, `task_id`.

- `infer: false` — structured operational facts
- `infer: true` — raw dialogue logs only

## Architecture

- **Kernel** — `/api/agents/kernel` — routes shell, recall tools
- **CPU** — sequential pipeline via `/api/agents/cpu` + `runCpuPipeline`
- **GPU** — parallel workers after DISPATCH (`gpu_dispatch` → `os:gpu`)
- **HydraDB** — `/api/hydradb/*` — tenant boot, add memory, recall
- **Realtime** — Supabase Broadcast on `os:kernel`, `os:cpu`, `os:memory`, `os:io`, `os:gpu`

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
| `OPENAI_API_KEY` | Yes | Vercel AI SDK |
| `HYDRADB_API_KEY` | Yes | Live HydraDB; no mock |
| `HYDRADB_TENANT_ID` | No | Defaults to `devfactory-os` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Realtime panels |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Client subscribe |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server broadcast only |
| `NEXT_PUBLIC_APP_URL` | No | Production URL for callbacks |

3. Redeploy after env changes. `vercel.json` sets longer `maxDuration` for agent and HydraDB routes.

Never commit real API keys — copy from `.env.example` into `.env.local` or Vercel only.

## Demo script

```text
submit build auth microservice with JWT
status
recall auth preferences
memory stream JWT
show memory
```

Watch CPU steps pulse, GPU heatmap light up on DISPATCH, and Hydra memory panel fill from Realtime.

# AgentOS / DevFactory OS — UI Research (May 2026)

Research-only synthesis for **hero**, **dock**, and **workspace** surfaces. No code changes were made to `components/` or `app/`.

---

## 1. Current product baseline (repo)

DevFactory OS is a **terminal-style OS monitor** (Next.js 15, xterm.js, OpenRouter, HydraDB, Supabase Realtime) with a four-mode shell:

| Mode | Role today |
|------|------------|
| **hero** | Full-screen intro: boot sequence, telemetry chips, mini graph, CTA → workspace |
| **terminal** | Full monitor + xterm shell; panels collapsed |
| **desktop** | Aurora / glass “desktop” metaphor (lazy-loaded) |
| **workspace** | Mission panels: agent graph, task, memory, terminal, execution |

**Dock** (`DevFactoryDock`): Magic UI dock with mode switcher (hero / terminal / desktop / workspace), optional command bar (hidden in hero), panel quick-jump, spawn/create shortcuts.

**Differentiators already in code:** unified agent DAG (`lib/os/agent-graph.ts`), realtime graph highlighting (`os:graph`), HydraDB memory hub, kernel/CPU/GPU pipeline, shell-driven orchestration (`submit`, `spawn`, `recall`).

---

## 2. Web research — themes & references

### 2.1 AI agent orchestration UI (2025–2026)

**Mission-control dashboards** treat the operator as air-traffic control: one SPA, many panels, live state, governance.

| Product | Pattern | Relevance to AgentOS |
|---------|---------|----------------------|
| [builderz-labs/mission-control](https://github.com/builderz-labs/mission-control) | 32 panels (tasks, agents, tokens, memory, cron, pipelines); Kanban 6-column board; WebSocket/SSE; quality gates (Aegis); multi-gateway adapters | Workspace = panel grid + task column states; dock = dispatch |
| [openclaw-mission-control](https://github.com/abhi1693/openclaw-mission-control) | Org/board/task hierarchy; approval flows; gateway management; activity timeline | Human-in-the-loop before `cpu.commit`; audit trail in memory panel |
| [BEKO2210/Control-Center](https://github.com/BEKO2210/Control-Center) | 10 screens: dashboard, Kanban, content pipeline, calendar, memory bank, **digital office** (agent workstations + glow) | “Digital office” maps to desktop mode; memory bank → Hydra panel |
| [AgentDock](https://github.com/ahsan-horani-folio/agentdock) | NL router → GitHub/Jira agents; register agents in UI; logs panel | Dock command bar + agent registry already similar |

**Trend:** Dense operator UIs win when **latency to answer “what is running?”** is &lt;2s — status, cost, last action, next gate — not when they look like chat apps.

### 2.2 Mission control dashboard UX

Shared UX primitives across mission-control forks:

1. **Kanban with explicit review column** — inbox → assigned → in progress → review → quality → done (mission-control); 5–6 columns standard.
2. **Agent detail modal** — compact overview + model selector + sub-agent config without leaving board.
3. **Smart polling** — WebSocket/SSE when focused; pause when tab away (battery + noise).
4. **Token/cost strip** — always visible; alerts on spend anomalies.
5. **Skills hub** — browse/install agent skills with security scan (stretch for DevFactory custom agents).

AgentOS already has **workspace telemetry footer** and **hero telemetry chips** — align copy and layout with “mission control strip” (single scannable row).

### 2.3 Terminal OS aesthetic

| Reference | Aesthetic | Takeaway |
|-----------|-----------|----------|
| [eDEX-UI](https://github.com/GitSquared/edex-ui) / [xDEX-UI fork](https://github.com/andreas-hartmann/xdex-ui) | TRON HUD: fullscreen, multi-pane, CPU/RAM/network, theme JSON + `injectCSS` | Hero = HUD; workspace panels = eDEX panes; optional sound on spawn |
| [Nexterm](https://github.com/musanmaz/nexterm) | Sci-fi themes (Tron, Matrix, Cyberpunk); xterm WebGL; command history sidebar | Theme tokens per mode; WebGL graph optional |
| [Termlnk](https://github.com/termlnk/termlnk) | 71 Base46 themes; workspace splits; MCP AI sessions | Per-mode theme persistence in `uiModeStore` |
| [terminal-ui-design-system](https://github.com/chyinan/terminal-ui-design-system) | macOS window chrome, terracotta + green CLI, JetBrains Mono | Window chrome on desktop mode panels |
| [con-terminal](https://github.com/nowledge-co/con-terminal) | GPU terminal + **AI harness in-place**; Flexoki; agent accountable in visible PTY | Shell stays source of truth; UI reflects PTY state |

**Trend:** “Sci-fi” works when **telemetry is real** (heartbeat, tokens, graph nodes) — decorative particles without data feel hollow after 30s.

### 2.4 Dock & mode switching UI

| Reference | Pattern | Takeaway |
|-----------|-----------|----------|
| [DockDoor](https://github.com/ejbills/DockDoor) / [DockSens](https://github.com/realchoi/docksens) | Hover dock icon → **window previews**; Alt-Tab with large previews | Dock hover → preview **workspace panels** or **active agent subgraph** |
| [MasterDock](https://github.com/durasi/MasterDock) | Split dock into 3 sections; per-section themes; cross-dock drag | Split dock: **modes** | **commands** | **agents** |
| Retro dock gists / [RetroWin](https://dev.to/pengpeng/retrowin-bringing-the-classic-windows-taskbar-back-on-macos-1d2) | Taskbar per window; hover thumbnail; pin/reorder | Running agents as dock badges with pulse |

AgentOS dock already documents modes via `MODE_PREVIEW` tooltips — extend to **live thumbnails** (graph snapshot, last terminal lines).

### 2.5 Linear & Vercel agent workspace

**Linear for Agents** ([linear.app/agents](https://linear.app/agents)):

- Agents as **workspace members** (assign, @mention, delegate).
- **Human stays assignee**; agent is contributor — accountability UX.
- **Delegation footer** on issue cards + **animated tab indicator** when coding agent works ([changelog](https://linear.app/changelog/2026-05-14-code-intelligence)).
- **Code Intelligence** — agent reads repo; auto-investigate on issue create; queue follow-ups while agent runs.

**Vercel AI SDK 6** ([blog](https://vercel.com/blog/ai-sdk-6)):

- Reusable `ToolLoopAgent` / `Agent` interface — same agent in chat UI, API, background job.
- Tool approval (human-in-the-loop), DevTools, strict structured outputs.

**Cursor Agents Window** ([docs](https://cursor.com/docs/agent/agents-window)):

- Multi-workspace agent list (local, cloud, SSH, worktrees).
- Parallel agents; cloud ↔ local handoff; diffs/PR in-agent.
- `/multitask` async subagents; multi-root workspaces ([changelog 3.2](https://cursor.com/changelog/04-24-26)).
- [CursorFlow](https://github.com/eungjin-cigro/cursorflow): terminal monitor + **DAG dependency view** + intervene/kill.

**Mapping:** DevFactory **workspace graph** ≈ CursorFlow DAG; **dock spawn** ≈ delegate issue; **hero** ≈ marketing + system health before enter.

### 2.6 Hackathon AI OS demos

| Project | Hook | Lesson |
|---------|------|--------|
| [HappyOS](https://github.com/happyfuckingai/HappyOS-hackathon) | MCP-isolated agents; reply-to; fan-in; circuit breakers; UI hub | Show **resilience story** on hero (degraded mode when Hydra offline) |
| [OrkestrAI](https://github.com/grsanudeep42-cmd/Orkestrai) | 6-agent sequential squad; WebSocket live logs; cyberpunk dashboard; 90s demo | **Timed demo path** baked into hero CTA |
| [Captain Cool OS](https://dev.to/vedant_5adc1428274e929ec3/how-we-built-captain-cool-os-a-multi-agent-ai-tactical-intelligence-system-for-cricket-captains-87h) | Adversarial agents + structured Pydantic handoffs + debate loop | CPU verify step as visible “debate” in graph animation |
| Control-Center “Digital Office” | Agent workstations with ambient glow by activity | Desktop mode: one window per `gpu.worker` |

**Trend:** Hackathon winners **script one 90s path** (submit → dispatch → memory → graph pulse) and show **orchestration visibly**, not just chat.

---

## 3. Gap analysis (AgentOS vs market)

| Area | Market expectation | AgentOS today | Gap |
|------|-------------------|---------------|-----|
| Hero | Proof of live system in &lt;3s | Telemetry chips + mini graph | Latency chip empty; no scripted demo |
| Dock | Mode + context previews | Icons + tooltips | No hover preview of panel/agent state |
| Workspace | Kanban + agent modal + cost | Graph + panels + footer telemetry | No task board column; no agent detail drawer |
| Accountability | Who owns task vs who executes | Shell `task_id` in store | No assignee/delegate UI metaphor |
| Realtime | SSE when away pauses | Supabase always on | Optional pause when hero/desktop |
| Governance | Quality gate before done | `cpu.verify` in pipeline | Gate not visible in UI |

---

## 4. Top 10 actionable ideas (ranked by impact)

Impact = **operator clarity × demo memorability × fit to existing architecture**, with effort noted.

| Rank | Idea | Impact | Effort | Surfaces |
|------|------|--------|--------|----------|
| **1** | **Scripted “90s demo” CTA on hero** — one button runs `submit` → watch CPU pulse → GPU heatmap → memory panel fill (documented commands in README) | Highest for demos, investors, first-run | Low | hero, dock |
| **2** | **Dock hover previews** — on mode icon hover, show thumbnail: workspace graph active nodes, terminal last 3 lines, or hero telemetry | High — matches DockDoor/mission-control “pane of glass” | Medium | dock |
| **3** | **Mission-control task strip** — lightweight Kanban (inbox / running / review / done) driven by `task_id` + CPU step from `os:cpu` | High for orchestration UX | Medium | workspace |
| **4** | **Agent detail drawer** — click graph node → template, last memory, token usage, `kill` / `spawn` actions | High — Linear agent card + mission-control modal | Medium | workspace, dock |
| **5** | **Orchestration strip everywhere** — promote hero `strip` variant to persistent top bar in terminal/workspace with tokens, agents, memory, spawn flash | High — single scannable HUD (eDEX pattern) | Low | hero, workspace, terminal |
| **6** | **Delegation metaphor in UI** — “Operator” (human) + “Contributor” (active agent template) on task panel; mirrors Linear | Medium-high for trust | Low | workspace |
| **7** | **Dock tri-zone** — modes (left) · command (center) · active agents + pulse (right); inspired by MasterDock | Medium-high for power users | Medium | dock |
| **8** | **Quality gate visualization** — when pipeline hits `cpu.verify`, graph edge animates + dock badge “REVIEW”; block “done” until verify passes | Medium-high for governance story | Medium | workspace, dock |
| **9** | **Desktop “digital office”** — one glass window per active `gpu.worker` with glow from `os:gpu` | Medium — differentiator vs flat panels | High | desktop |
| **10** | **DAG dependency toggle on graph** — optional view: dependency edges only (CursorFlow `F` key pattern) | Medium for advanced users | Medium | workspace |

### Implementation notes (docs only — no code changed)

- **#1** can ship as copy + `dispatchShellCommand` sequence from hero without new APIs.
- **#2–#4** mostly consume existing `useOsStore` + `os:*` realtime; Kanban needs minimal task state (may extend `osStore` later).
- **#5** reuses `AgentOsHero` `variant="strip"` already in shell when `mode !== "hero"`.
- **#8** maps directly to `cpu.verify` in `lib/os/pipeline.ts`.
- **#10** aligns with `getDownstreamAgents` / graph edges in `lib/os/agent-graph.ts`.

---

## 5. Recommended phased rollout

| Phase | Items | Outcome |
|-------|-------|---------|
| **P0 (1–2 days)** | #1, #5, #6 copy/layout | Demo-ready hero + consistent HUD |
| **P1 (3–5 days)** | #2, #3, #4 | Mission-control feel in workspace |
| **P2 (1–2 weeks)** | #7, #8, #10 | Power-user dock + governance |
| **P3 (optional)** | #9 | Desktop mode payoff |

---

## 6. Visual & motion vocabulary (consistent with repo)

Keep existing tokens: `hero-cyan`, `hero-purple`, `hero-obsidian`, `os-green`, `os-amber`, `font-mono`.

| Pattern | Reference | Apply to |
|---------|-----------|----------|
| Telemetry chips (absolute, blur) | Hero today | Strip + workspace corners |
| Graph edge pulse | `WorkspaceAgentGraph` | Verify/dispatch transitions |
| Boot sequence | `HeroBootSequence` | First visit only; skip → workspace |
| Spawn flash | `AGENT_SPAWNED_EVENT` | Dock agent zone + hero strip |
| Panel ring focus | `DevFactoryDock` `focusPanel` | Dock panel shortcuts |

Avoid: sound effects (polarizing), fake latency numbers, chat-first layout replacing graph.

---

## 7. Sources

### Mission control & orchestration
- https://github.com/builderz-labs/mission-control  
- https://github.com/abhi1693/openclaw-mission-control  
- https://github.com/BEKO2210/Control-Center  
- https://github.com/ahsan-horani-folio/agentdock  

### Terminal / sci-fi OS
- https://github.com/GitSquared/edex-ui  
- https://github.com/andreas-hartmann/xdex-ui  
- https://github.com/musanmaz/nexterm  
- https://github.com/termlnk/termlnk  
- https://github.com/chyinan/terminal-ui-design-system  
- https://github.com/nowledge-co/con-terminal  

### Dock & switching
- https://github.com/ejbills/DockDoor  
- https://github.com/realchoi/docksens  
- https://github.com/durasi/MasterDock  

### Linear / Vercel / Cursor
- https://linear.app/agents  
- https://linear.app/changelog/2026-05-14-code-intelligence  
- https://vercel.com/blog/ai-sdk-6  
- https://v6.ai-sdk.dev/docs/agents/building-agents  
- https://cursor.com/docs/agent/agents-window  
- https://cursor.com/changelog/04-24-26  
- https://github.com/eungjin-cigro/cursorflow  

### Hackathon AI OS
- https://github.com/happyfuckingai/HappyOS-hackathon  
- https://devpost.com/software/happyos-ai-agent-os-powering-three-autonomous-startups  
- https://github.com/grsanudeep42-cmd/Orkestrai  
- https://dev.to/vedant_5adc1428274e929ec3/how-we-built-captain-cool-os-a-multi-agent-ai-tactical-intelligence-system-for-cricket-captains-87h  

### Internal (read-only)
- `/Users/shrianshjaiswal/demo1/README.md`  
- `/Users/shrianshjaiswal/demo1/store/uiModeStore.ts`  
- `/Users/shrianshjaiswal/demo1/components/AgentOsShell.tsx`  
- `/Users/shrianshjaiswal/demo1/components/DevFactoryDock.tsx`  
- `/Users/shrianshjaiswal/demo1/components/hero/AgentOsHero.tsx`  

---

*Generated for AgentOS UI research. Modify only `docs/` per task constraints.*

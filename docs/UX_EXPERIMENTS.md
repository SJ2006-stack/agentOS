# UX Experiments — DevFactory OS

Aligned with `docs/AGENTOS_RESEARCH.md` (dock live thumbnails, graph pulse). Scoped CSS lives in `components/modes/workspace-ux.css` — no changes to `globals.css` theme presets or `AgentOsShell` hero/dock mode logic.

## Experiments

### 1. Agent graph node heartbeat pulses

**Where:** `components/modes/WorkspaceAgentGraph.tsx`, `components/modes/workspace-ux.css`

**What:** Active graph nodes get a slow glow pulse (`workspace-node-active`). Each kernel heartbeat tick (`kernel.heartbeat.ts`) adds a short amber flash (`workspace-node-heartbeat`) on active nodes so the graph feels tied to the live bus.

**Verdict:** **Keep.** Edge traveling pulses already existed in `globals.css`; nodes were static. Low cost, clear “alive” signal without changing layout.

---

### 2. Dock hover preview mini-cards

**Where:** `components/modes/DockModePreview.tsx`, `components/DevFactoryDock.tsx`

**What:** Mode dock tooltips show a small layout mock (terminal = shell + 3 panels, workspace = 4×2 grid, desktop = aurora + windows, hero = intro chip) plus tag + hint, instead of a single line of text in a box.

**Verdict:** **Keep.** Faster mode recognition at a glance; still lightweight (no screenshots). If tooltips feel heavy on mobile, consider shortening hover delay only.

---

### 3. Workspace telemetry “live” bar

**Where:** `components/modes/WorkspaceMode.tsx`, `workspace-ux.css`

**What:** Footer adds pulsing **live** dot + kernel uptime, token count flash on `usage_tick`, last routed command, and motion on active agent chips.

**Verdict:** **Keep** with monitoring. Uptime/cmd line may crowd small screens — drop `cmd` first if needed.

---

### 4. Terminal spawn split-line

**Where:** `components/shell/XtermShell.tsx`

**What:** On `[agent] spawning <id>` / `[kernel] spawn <id>` in the stream (or `devfactory:agent-spawned`), xterm prints an amber split banner, e.g. `──── spawn · cpu.plan ────`. Wires `dispatchAgentSpawned` from the shell so hero/desktop/terminal flash UIs can react.

**Verdict:** **Keep.** High-signal moment for agent activation; debounced to avoid duplicate banners per spawn.

---

## Not touched (by design)

- `app/globals.css` theme presets and hero keyframes
- `AgentOsShell` hero/dock mode routing
- `components/hero/*` (owned elsewhere)

## Build

Run `npm run build` after changes; owned paths: `components/modes/`, `components/AgentGraphPanel.tsx`, `components/shell/XtermShell.tsx`, `docs/`.

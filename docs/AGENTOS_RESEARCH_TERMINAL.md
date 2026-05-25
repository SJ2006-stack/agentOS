# DevFactory OS — Terminal, Shell UX & Memory Visualization Research

> **Scope:** DevFactory OS only. Research append — no implementation.  
> **Date:** 2026-05-25  
> **Focus:** Low-latency shell UX, memory panel ideas, graph visualization trends.

---

## 1. Executive summary

DevFactory OS already combines **xterm.js** (`XtermShell`), **prefix-colored streaming output** (`[kernel]`, `[cpu]`, `[memory]`, `[fault]`), a **HydraDB slot list** (`HydraMemoryPanel`), and a **static SVG agent graph** (`WorkspaceAgentGraph`). External research points to three high-leverage upgrades without bloating the shell:

1. **Latency budget:** Treat shell I/O and autocomplete as part of the keystroke rhythm (P99 &lt;100ms perceived; debounce + abort stale requests).
2. **Renderer:** Optional `@xterm/addon-webgl` for dense scrollback during agent floods; keep cinematic effects in **chrome panels**, not inside the PTY stream.
3. **Memory + graph:** Surface HydraDB `graph_context` (query paths, chunk relations) as a **small path strip + grouped nodes**, not raw JSON; align agent graph pulses with live `activeNodeIds` and recall path groups.

---

## 2. xterm.js cinematic UI

### 2.1 Reference projects

| Project | Stack | Cinematic patterns |
|--------|-------|-------------------|
| [hackerterm](https://github.com/gyozatech/hackerterm) | Electron + xterm.js + Canvas 2D | Boot sequence, Matrix-style data streams, 3D globe, target map, waveform tied to keyboard, theme packs (Matrix Green, Red Alert) |
| [terminal-demo](https://github.com/steelydylan/terminal-demo) | Vanilla/React, zero deps | Scripted typing, spinners, progress bars, select menus, pause/resume — good for **marketing hero**, not live shell |
| [aiterminal](https://github.com/austindixson/aiterminal) | Electron + xterm + OpenRouter | Multi-session tabs, agent loops, file tree — closest product cousin to DevFactory OS |
| [xterm.js](https://github.com/xtermjs/xterm.js) | Core | GPU path via `@xterm/addon-webgl`; image addon; used by VS Code, Tabby, Hyper |

### 2.2 Performance vs. spectacle

- **Inside the terminal:** Keep the PTY path honest — real command echo, colored prefixes, scrollback. Cinematic effects that rewrite the buffer (Matrix rain, heavy ANSI animation) fight **low-latency** agent streaming.
- **Outside the terminal:** DevFactory already uses `BootSequence` (typing animation) and workspace chrome. Extend spectacle there: sidebar metrics, graph edge pulses, memory slot animations — mirroring hackerterm’s “data panel” split.
- **WebGL addon:** Load `@xterm/addon-webgl` when scrollback &gt;2k lines or burst output from multi-agent runs; handle `webglcontextlost` by disposing and falling back to canvas renderer ([xterm WebGL README](https://github.com/xtermjs/xterm.js/tree/master/addons/addon-webgl)).

### 2.3 DevFactory OS fit

| Existing | Research-backed next step |
|----------|---------------------------|
| `XtermShell` + `FitAddon` + CSS theme sync | Add WebGL addon behind feature flag; cap scrollback or virtualize old lines |
| `BootSequence` typing lines | Optional “threat level” / subsystem checklist tied to `hydraConfigured` + agent count |
| Prefix colors in `colorForLine` | Pulse cursor or dim idle prompt while `fetch('/api/os/command')` in flight |
| No PTY (fetch-based shell) | Document that “cinematic” = panel chrome; avoid fake typing on real user commands |

---

## 3. CLI autocomplete UX (low-latency shell)

### 3.1 Latency budgets

From [Design Search Autocomplete at Scale](https://sujeet.pro/articles/design-search-autocomplete):

- **Perceived budget:** P99 ~**100ms** keeps UI inside one keystroke (~150ms between keys); &gt;250ms feels laggy.
- **Debounce:** **200–300ms** before remote suggestion fetch; pair with **`AbortController`** so stale responses never overwrite newer prefixes.
- **Two-stage retrieval:** Cheap prefix/candidate generation → small rerank set (applies to `recall` suggestions and command hints).

### 3.2 Shell-native patterns

| Pattern | Source | Application to DevFactory OS |
|---------|--------|------------------------------|
| **Ghost text** (inline completion) | [Gemini CLI PR #20931](https://github.com/google-gemini/gemini-cli/pull/20931) | Grey completion after cursor; show only when suffix is unambiguous; clear on token boundary change |
| **`activeStart` invalidation** | Same PR | Track completion token start; clear suggestions when cursor moves before that index — prevents stale UI |
| **Tab vs. always-on** | Gemini CLI | Hide dropdown by default; **Tab** opens menu — reduces noise during `submit` typing |
| **Daemon + Unix socket** | [autocomplete-rs](https://docs.rs/crate/autocomplete-rs/latest), [zsh-llm-cli-autocomplete](https://github.com/duoyuncloud/zsh-llm-cli-autocomplete-tool) | Local `~/.cache` socket, &lt;10–20ms for static command/spec completion |
| **ZLE / POSTDISPLAY** | zsh plugins | Ghost via `region_highlight` — if OS shell stays in-browser, emulate with xterm **decoration API** or secondary “ghost” span in input buffer |

### 3.3 Command vocabulary (already in product)

`XtermShell` documents: `submit`, `spawn agent`, `agents`, `agent status`, `create agent`, `recall`, `memory stream`, `show memory`, `status`, `spawn`, `kill`, `help`.

**Autocomplete tiers:**

1. **Tier 0 (&lt;1ms):** Static trie of verbs + `agent status` multi-token templates.
2. **Tier 1 (&lt;50ms):** `useOsStore` agent IDs / template handles from `AGENT_GRAPH`.
3. **Tier 2 (debounced 250ms):** Hydra `recall_preferences` preview for `recall <q>` — abort on space/query change; cap 3 ghost lines.

### 3.4 Anti-patterns

- Dropdown positioned via browser overlay (Fig-style) — breaks in embedded xterm; prefer **in-terminal ghost** or **dock panel** list.
- Fetching OpenRouter for every keystroke — reserve LLM for `submit`, not completion.
- Showing completion while a command is **in flight** (`commandGenRef` already cancels stale output — mirror for suggestions).

---

## 4. OpenRouter agent status UI

### 4.1 SDK streaming models

OpenRouter’s **Agent SDK** (`@openrouter/agent`) shifts from delta accumulation to **items-based streaming** ([Working with Items](https://openrouter.ai/docs/agent-sdk/call-model/working-with-items.mdx), [Streaming](https://openrouter.ai/docs/agent-sdk/call-model/streaming)):

- `callModel()` → `ModelResult`
- **`getItemsStream()`** (recommended): each emission is a **complete item** with stable `item.id` — update `Map<id, item>`; React reconciles by key.
- **`getTextStream()`**: simple token append + blinking cursor.
- Also: `getReasoningStream()`, `getToolStream()`, `getToolCallsStream()`, `getFullResponsesStream()`.
- **Stop conditions:** `stepCountIs`, `hasToolCall`, `maxCost`; optional `allowFinalResponse` after halted tool turn.

DevFactory today uses **`@openrouter/sdk` chat completions** in `openrouter-agent.ts` with multi-step tool loop and **`[fault]`** lines via `openRouterFault()` — good for xterm, not yet item-typed UI.

### 4.2 Status UI patterns

| State | Terminal (xterm) | Workspace chrome |
|-------|------------------|------------------|
| Model routing | `[kernel] model → …` (已有) | KernelBar token line |
| Step / tool | `[cpu]` / `[gpu]` prefixed chunks | Graph `activeNodeIds` highlight |
| Reasoning | Optional dim stream (if model exposes) | Collapsible “thinking” strip — don't default open |
| Tool call | `function_call` name + arg preview | Node badge “running” → “done” (agrex pattern) |
| Usage | `[usage] prompt=… completion=…` | Bento / WorkspaceMode token chip |
| Error | `[fault] OpenRouter {code}: msg` | Red border on agent node |

### 4.3 Migration note (research only)

If adopting Agent SDK later:

- Bridge `getItemsStream()` → OS store: `{ id, type: 'message' \| 'function_call' \| 'reasoning', status, preview }`.
- Keep **one write path** to xterm for user-visible narrative; use store for graph/memory panels.
- **SSE** pattern from docs fits `/api/os/command` streaming extension without blocking shell prompt.

References: [Agent SDK overview](https://openrouter.ai/docs/agent-sdk/overview), [@openrouter/agent npm](https://www.npmjs.com/package/@openrouter/agent).

---

## 5. HydraDB memory visualization

### 5.1 Platform primitives

HydraDB is **graph-first** ([Introduction](https://docs.hydradb.com/get-started/introduction)):

- **Memories:** user/agent-scoped, `recall_preferences`, `infer: true` extracts preferences.
- **Knowledge:** tenant documents, `full_recall`.
- **Context graph:** triplets `source → relation → target`; enabled with **`graph_context: true`**.

Recall response shape ([Context Graphs](https://docs.hydradb.com/essentials/context-graphs)):

| Field | Meaning |
|-------|---------|
| `query_paths` | Multi-hop paths from query to chunks (relevancy score) |
| `chunk_relations` | Paths between returned chunks |
| `chunk_id_to_group_ids` | Group chunks by which path produced them |

**Forceful relations** (declared at ingest) vs. **extracted graph** — DevFactory `writeMemoryWithBroadcast` + `linkTaskMemory` / `cortex_source_ids` already use the declarative side.

### 5.2 DevFactory OS today

- `lib/hydradb/memory.ts`: `graph_context: true`, `search_forceful_relations: true`; `queryPaths` stringified to 80 chars.
- `HydraMemoryPanel`: slot list (status, agentId, preview) + last recall query + 2 chunks + truncated paths text.
- Shell: `recall <q>`, `memory stream`, `show memory`.

### 5.3 Memory panel ideas (low-latency, high-signal)

1. **Path strip:** Render top `query_paths` as clickable chips `A → relates → B` (parse structured objects when SDK exposes them; avoid raw `JSON.stringify` in UI).
2. **Grouped chunks:** Use `chunk_id_to_group_ids` — accordion per path group, max 3 chunks expanded.
3. **Recency encoding:** [agentid-memory-map](https://github.com/colapsis/agentid-memory-map) pattern — green &lt;1h, amber &lt;24h, slate older for slots.
4. **Live slot:** Keep `os:memory` broadcast → motion on new slot (already); add subtle **edge flash** on graph hub `HYDRA_MEMORY_HUB_ID` when hub memory writes.
5. **Mode toggle:** `recall` fast vs. thinking — expose Hydra `mode` in UI label; default fast for shell autocomplete tier 2.
6. **Hub vs. agent scope:** Visual distinction for `MEMORY_PREFIXES.hub` vs. `cpu.*` / `gpu.worker.*` sub_tenant prefixes.

### 5.4 Temporal / state confusion

Hydra whitepaper ([PDF](https://benchmarks.hydradb.com/hydradb.pdf)): versioned graph avoids “state confusion” (e.g. NYC 2022 vs London 2024). Panel should show **as-of** or **supersedes** when metadata provides it — even a small “timeline” tick for conflicting preferences.

---

## 6. Graph visualization trends (agent + memory)

### 6.1 Library landscape (2024–2025)

| Approach | Examples | Best for DevFactory |
|----------|----------|---------------------|
| **React Flow** | [agentid-memory-map](https://github.com/colapsis/agentid-memory-map), [agrex](https://github.com/ppazosp/agrex), [agent-iceberg](https://github.com/dheer309/agent-iceberg) | Agent templates, tool nodes, live `memory.update` — fits custom node types |
| **Force-directed (Canvas/WebGL)** | [react-force-graph](https://vasturiano.github.io/react-force-graph/) | Large memory graphs; **DAG mode** (`lr`, `radialout`) for pipeline stages |
| **D3 + worker** | [lxDIG-visual](https://github.com/lexCoder2/lxDIG-visual) | Heavy graphs off main thread — if node count &gt;50 |
| **Static SVG** | Current `WorkspaceAgentGraph` | Lowest latency, zero layout jank — keep for default workspace |

### 6.2 Agrex-style execution overlay

[agrex](https://github.com/ppazosp/agrex): JSONL trace → scrub timeline; `parentId` auto-edges; node `status: running | done`.

**Mapping:** CPU steps `INTAKE → PLAN → ROUTE → DISPATCH → VERIFY → COMMIT` as transient highlights on existing `AGENT_GRAPH` edges (already have `workspace-graph-edge-pulse` CSS).

### 6.3 Memory ↔ agent graph linking

- **Nodes:** agent templates (existing) + optional **memory hub** node.
- **Edges:** `forceful` / `chunk_relations` from last recall; animate edge when `activeNodeIds` and path share template id (`GRAPH_RECALL_PREFIXES` in `agent-graph-data`).
- **Don't** force-layout 8 templates — use fixed `AGENT_GRAPH_LAYOUT` + pulse; reserve force graph for “explore memory” modal.

### 6.4 Interaction budget

- **&lt;16ms** frame budget for graph during shell typing — pause simulations when xterm focused.
- **MiniMap** only in fullscreen graph mode (memory-map pattern).
- **Double-click expand** (lxDIG) for “one hop” related memories — triggers debounced `recall_preferences` with narrower query.

---

## 7. Integrated recommendations (priority)

| Priority | Area | Action |
|----------|------|--------|
| P0 | Shell latency | Abort in-flight `/api/os/command` display rules already via `commandGenRef`; add debounced static autocomplete trie |
| P0 | Memory panel | Parse/display `query_paths` as human triplets; group chunks by `chunk_id_to_group_ids` when API returns them |
| P1 | xterm | WebGL addon + context-loss handler; idle prompt state while streaming |
| P1 | OpenRouter UI | Item-typed store parallel to xterm lines; tool badges on graph nodes |
| P2 | Cinematic | BootSequence optional “subsystem” lines; sidebar data stream (non-terminal) |
| P2 | Graph | Fullscreen React Flow “memory explore” fed by `recall_preferences` + `graph_context` |
| P3 | Agent SDK | Evaluate `@openrouter/agent` `getItemsStream` vs. current chat completion loop |

---

## 8. Sources

### xterm / cinematic
- https://github.com/gyozatech/hackerterm
- https://github.com/steelydylan/terminal-demo
- https://github.com/austindixson/aiterminal
- https://github.com/xtermjs/xterm.js
- https://github.com/xtermjs/xterm.js/tree/master/addons/addon-webgl

### Autocomplete / shell UX
- https://sujeet.pro/articles/design-search-autocomplete
- https://github.com/google-gemini/gemini-cli/pull/20931
- https://docs.rs/crate/autocomplete-rs/latest
- https://github.com/duoyuncloud/zsh-llm-cli-autocomplete-tool
- https://dev.to/mukul_d/maruti-zsh-a-custom-high-performance-zsh-engine-jek

### OpenRouter
- https://openrouter.ai/docs/agent-sdk/overview
- https://openrouter.ai/docs/agent-sdk/call-model/streaming
- https://openrouter.ai/docs/agent-sdk/call-model/working-with-items
- https://www.npmjs.com/package/@openrouter/agent

### HydraDB
- https://docs.hydradb.com/get-started/introduction
- https://docs.hydradb.com/essentials/memories
- https://docs.hydradb.com/essentials/context-graphs
- https://docs.hydradb.com/api-reference/endpoint/recall-overview
- https://benchmarks.hydradb.com/hydradb.pdf

### Graph visualization
- https://github.com/colapsis/agentid-memory-map
- https://github.com/ppazosp/agrex
- https://vasturiano.github.io/react-force-graph/
- https://github.com/lexCoder2/lxDIG-visual
- https://github.com/dheer309/agent-iceberg

### DevFactory OS code references (baseline)
- `components/shell/XtermShell.tsx`
- `components/HydraMemoryPanel.tsx`
- `components/modes/WorkspaceAgentGraph.tsx`
- `lib/ai/openrouter-agent.ts`
- `lib/hydradb/memory.ts`
- `components/BootSequence.tsx`

---

*Append new dated sections below for follow-up research passes.*

# UI typography overlap audit

**Status:** Fixer completed (inspector timed out after 4m — fixes from code review + targeted layout pass)

`AUDIT_COMPLETE`

## Summary

| Severity | Count |
|----------|-------|
| Blocker  | 2     |
| Minor    | 9     |
| **Total**| **11**|

Inspector report was not received within the polling window. Issues below were identified via static review of hero, workspace, dock, create-agent, and graph components.

---

## Findings (pre-fix)

### Hero (`AgentOsHero` fullscreen)

| # | Element | Cause | Severity |
|---|---------|-------|----------|
| 1 | "AgentOS" headline | No `font-size` / line-height — inherited body mono size collided with badge and subtitle | Blocker |
| 2 | Stats bar (`2847 agents…`) | Tight `gap-y-1`, no explicit `line-height` on animated counters | Minor |
| 3 | Orchestration strip (terminal/desktop) | `truncate` on parent with multiple inline spans — agent label + task text overlapped | Minor |
| 4 | Command bar hint under input | Single-line span, no `leading-snug` — could clip on narrow widths | Minor |

### Workspace (`WorkspaceMode` + graph)

| # | Element | Cause | Severity |
|---|---------|-------|----------|
| 5 | Graph panel header | `justify-between` without wrap — title and hint collided on narrow center column | Minor |
| 6 | SVG node labels | `y=11.5` in `NODE_H=18` rects — ascender/descender clip; custom row at `y=58` overlapped `hydradb.memory` at `y=52` | Blocker |
| 7 | Active route banner | Dense single line without `line-height` guard | Minor |

### Dock (`DevFactoryDock`)

| # | Element | Cause | Severity |
|---|---------|-------|----------|
| 8 | Spawn quick menu | No z-index above dock icons — menu labels could sit under magnified icons | Minor |

### Create agent (`CreateAgentOverlay` / `CreateAgentFlow`)

| # | Element | Cause | Severity |
|---|---------|-------|----------|
| 9 | Overlay title + subtitle | Tight `mt-0.5`, no `leading-tight` / `leading-snug` | Minor |
| 10 | Template cards | `items-baseline` + long `displayName` — name and `templateId` collided | Minor |
| 11 | Step headers (agent name) | No `truncate` on long names in flex row | Minor |

### Z-index stack (verified)

- Dock: `z-50`
- Create agent overlay: `z-[160]`
- DOOM modal: `z-[200]`
- Theme toggler: `z-[100]`

No changes needed to DOOM/create-agent ordering.

---

## Fixes applied

### `components/hero/AgentOsHero.tsx`
- Headline: `<h1 className="agentos-hero-title">` with clamp sizing (CSS)
- Subtitle: `<p>` with `text-base leading-relaxed sm:text-lg`
- Stats bar: `gap-y-2`, `py-1`, `leading-normal`
- Orchestration strip: flex row with `truncate` only on task segment; `min-h-[2.25rem]`, `leading-normal`
- Command hint: `text-[11px] leading-snug`

### `app/globals.css`
- `.agentos-hero-title` — `clamp(2.75rem, 10vw, 5.5rem)`, `line-height: 1.05`
- `.agentos-orchestration-strip button` — `line-height: 1.4`
- `.agentos-hero-stats` — `line-height: 1.5`

### `components/modes/WorkspaceMode.tsx`
- Graph header: `flex-wrap`, `gap-x-2 gap-y-0.5`, `leading-snug` on both labels

### `components/modes/WorkspaceAgentGraph.tsx`
- `NODE_H` 18 → 20; labels `dominantBaseline="middle"` at `NODE_LABEL_Y`
- `viewBox` height 78 → 84; custom agents row `y` 58 → 64 (clear `hydradb.memory`)
- SVG `overflow-visible`

### `components/modes/workspace-ux.css`
- Graph host + SVG `overflow: visible`
- Pipeline step label `line-height: 1.35`
- `.workspace-stage-label` utility for stage captions

### `components/dock/DevFactoryDock.tsx`
- Spawn menu `z-[60]`; menu items `leading-snug`

### `components/create-agent/CreateAgentOverlay.tsx`
- Header `leading-tight` / `leading-snug`; footer `leading-relaxed`, `break-all` on code

### `components/create-agent/CreateAgentFlow.tsx`
- Template cards: `min-w-0 truncate` on display name; step headers truncate long names

### `components/pipeline/MissionPipeline.tsx`
- `.mp-name`: `line-height: 1.35`, `word-break: break-word`

---

## Build

`npm run build` — **passed** (Next.js 15.5.18)

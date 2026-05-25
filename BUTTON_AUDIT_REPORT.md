# Button audit & CoolMode integration

**Date:** 2026-05-25  
**Build:** `npm run build` — **pass** (RippleButton has benign ESLint unused-import warnings in forwardRef scope)

## CoolMode integration

| Approach | Detail |
|----------|--------|
| **Component** | `components/ui/cool-mode.tsx` — `applyParticleEffect`, `CoolMode`, types; `particleCount` wired to burst limit |
| **Default particles** | `DEFAULT_COOL_MODE_OPTIONS` → `✨`, count 45 |
| **Primary integration** | `RippleButton` applies particles on the **`<button>` ref** (no layout-breaking span wrapper); `coolMode={false}` to opt out |
| **Dock icons** | `DevFactoryDock` wraps `DockIcon` in `<CoolMode className="inline-flex">` (not `RippleButton`) |
| **Excluded** | xterm canvas (`XtermShell`) — no buttons on terminal surface; graph SVG nodes use `onClick` spawn (no CoolMode on canvas) |

## Broken buttons found & fixes

| Location | Before | After |
|----------|--------|-------|
| **Desktop taskbar Start** (`DesktopMode.tsx`) | `RippleButton` with `aria-label="Start"` but **no `onClick`** — click did nothing | Opens terminal, focuses command input, scrolls to `#devfactory-shell` |
| **Workspace graph legend** (`WorkspaceAgentGraph.tsx`) | `ComicText` used without import — build error | Added `ComicText` import |
| **Dock imports** (`DevFactoryDock.tsx`) | Duplicate `CoolMode` imports | Single import + `inline-flex` wrapper on mode/spawn icons |

## Audited areas (working)

| Area | Status |
|------|--------|
| `AgentOsHero.tsx` | CTAs, command Run, orchestration strip → `setMode` / `dispatchShellCommand` |
| `DevFactoryDock.tsx` | Mode switch, spawn menu actions → `enterMode` / `submitCommand` |
| `CreateAgentFlow.tsx` | Name → Continue (`goNextFromName`), templates, custom create |
| `WorkspaceAgentGraph.tsx` | Template/custom nodes → `spawnTemplate` + `dispatchShellCommand` |
| `WorkspaceAgentList.tsx` | Row click + Spawn Agent footer |
| `WorkspaceDemoBar.tsx` | Demo chips → `runWorkspaceDemo` |
| `DevFactoryCommandBar.tsx` | Suggestions + Run submit |
| `AgentGraphControls.tsx` | Create agent expand, list toggle |
| `PipelineTimeline.tsx` | Selectable step buttons |
| `WorkspaceDemoBar.tsx` | Build web app chip → `runWorkspaceDemo` |
| `LandingPage.tsx` | Spawn CTA → `/os` + `queueFirstAgentSpawn` |
| `HydraMemoryPanel.tsx` | Details toggle |

## Files changed

- `components/ui/cool-mode.tsx` (new)
- `components/ui/ripple-button.tsx`
- `components/modes/DesktopMode.tsx`
- `components/dock/DevFactoryDock.tsx`
- `components/modes/WorkspaceAgentGraph.tsx`
- `components/landing/LandingPage.tsx` (duplicate import cleanup)
- `BUTTON_AUDIT_REPORT.md` (this file)

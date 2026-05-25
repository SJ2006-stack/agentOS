"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Check,
  LayoutDashboard,
  Rocket,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavId = "overview" | "agents" | "deployments" | "settings";

const NAV: { id: NavId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "deployments", label: "Deployments", icon: Rocket },
  { id: "settings", label: "Settings", icon: Settings },
];

const STATS = [
  { label: "Active agents", value: "12", delta: "+3 today" },
  { label: "Tasks completed", value: "847", delta: "98% success" },
  { label: "Deploy latency", value: "1.2s", delta: "p95 last hour" },
  { label: "Token usage", value: "2.4M", delta: "within budget" },
] as const;

const AGENTS = [
  { name: "cpu.plan", status: "running", task: "Roadmap synthesis" },
  { name: "gpu.worker", status: "idle", task: "Awaiting dispatch" },
  { name: "kernel.orchestrator", status: "running", task: "Pipeline COMMIT" },
  { name: "cpu.verify", status: "complete", task: "Type-check pass" },
] as const;

export function DemoWebApp() {
  const [nav, setNav] = useState<NavId>("overview");
  const [toast, setToast] = useState<string | null>(null);
  const [deployClicks, setDeployClicks] = useState(0);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }, []);

  const pageTitle = useMemo(
    () => NAV.find((n) => n.id === nav)?.label ?? "Overview",
    [nav]
  );

  return (
    <div className="fixed inset-0 z-20 flex h-[100dvh] w-full overflow-hidden bg-[#0a0f14] font-mono text-[#e2e8f0]">
      <aside className="flex w-52 shrink-0 flex-col border-r border-[#00ffb2]/20 bg-[#060a0e]">
        <div className="border-b border-[#00ffb2]/15 px-4 py-4">
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#00ffb2]/70">
            DevFactory
          </span>
          <p className="mt-1 text-sm font-medium text-[#00ffb2]">Agent Console</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setNav(id)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] transition-colors",
                nav === id
                  ? "bg-[#00ffb2]/15 text-[#00ffb2]"
                  : "text-[#94a3b8] hover:bg-white/5 hover:text-[#e2e8f0]"
              )}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden />
              {label}
            </button>
          ))}
        </nav>
        <p className="border-t border-white/10 px-4 py-3 text-[9px] leading-snug text-[#64748b]">
          Built-in demo web app — always live at /demo
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
          <div>
            <h1 className="text-base font-medium text-[#00ffb2]">{pageTitle}</h1>
            <p className="text-[10px] text-[#64748b]">
              Multi-agent SaaS dashboard · interactive demo
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Notifications"
              onClick={() => showToast("3 agent events in the last hour")}
              className="rounded-lg border border-white/10 p-2 text-[#94a3b8] transition-colors hover:border-[#00ffb2]/30 hover:text-[#00ffb2]"
            >
              <Bell className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => {
                setDeployClicks((c) => c + 1);
                showToast(`Deploy #${deployClicks + 1} queued to production`);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#00ffb2]/40 bg-[#00ffb2]/10 px-3 py-1.5 text-[11px] text-[#00ffb2] transition-colors hover:bg-[#00ffb2]/20"
            >
              <Rocket className="size-3.5" aria-hidden />
              Deploy
            </button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-auto p-5">
          {nav === "overview" && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {STATS.map((s) => (
                  <article
                    key={s.label}
                    className="rounded-xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <p className="text-[10px] uppercase tracking-wider text-[#64748b]">
                      {s.label}
                    </p>
                    <p className="mt-2 text-2xl font-medium text-[#00ffb2]">{s.value}</p>
                    <p className="mt-1 text-[10px] text-[#94a3b8]">{s.delta}</p>
                  </article>
                ))}
              </div>
              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-3 flex items-center gap-2 text-[11px] text-[#94a3b8]">
                  <Activity className="size-3.5 text-[#00ffb2]" aria-hidden />
                  Live activity
                </div>
                <ul className="space-y-2 text-[11px]">
                  {[
                    "GPU worker streamed preview.html",
                    "VERIFY passed — web app ready",
                    "COMMIT published to /demo",
                  ].map((line) => (
                    <li
                      key={line}
                      className="flex items-center gap-2 rounded-md border border-white/5 bg-black/20 px-3 py-2"
                    >
                      <Check className="size-3 shrink-0 text-[#00ffb2]" aria-hidden />
                      {line}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}

          {nav === "agents" && (
            <div className="overflow-hidden rounded-xl border border-white/10">
              <table className="w-full text-left text-[11px]">
                <thead className="border-b border-white/10 bg-white/[0.04] text-[10px] uppercase tracking-wider text-[#64748b]">
                  <tr>
                    <th className="px-4 py-2.5">Agent</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Current task</th>
                  </tr>
                </thead>
                <tbody>
                  {AGENTS.map((a) => (
                    <tr key={a.name} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 font-medium text-[#00ffb2]">{a.name}</td>
                      <td className="px-4 py-3 capitalize text-[#94a3b8]">{a.status}</td>
                      <td className="px-4 py-3 text-[#cbd5e1]">{a.task}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {nav === "deployments" && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[#00ffb2]/25 bg-[#00ffb2]/5 py-16 text-center">
              <BarChart3 className="size-10 text-[#00ffb2]/60" aria-hidden />
              <p className="max-w-sm text-[12px] text-[#94a3b8]">
                Run <span className="text-[#00ffb2]">Build web app</span> in DevFactory OS to
                replace this page with a Gemini-generated dashboard at this URL.
              </p>
              <button
                type="button"
                onClick={() => showToast("Deployment history synced")}
                className="rounded-lg border border-[#00ffb2]/35 px-4 py-2 text-[11px] text-[#00ffb2] hover:bg-[#00ffb2]/10"
              >
                Sync history
              </button>
            </div>
          )}

          {nav === "settings" && (
            <div className="max-w-md space-y-4">
              <label className="block text-[11px]">
                <span className="text-[#64748b]">Workspace name</span>
                <input
                  type="text"
                  defaultValue="agent-os-beta"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[#e2e8f0] outline-none focus:border-[#00ffb2]/40"
                />
              </label>
              <label className="flex items-center gap-2 text-[11px]">
                <input type="checkbox" defaultChecked className="accent-[#00ffb2]" />
                <span className="text-[#94a3b8]">Enable realtime agent feed</span>
              </label>
              <button
                type="button"
                onClick={() => showToast("Settings saved")}
                className="rounded-lg border border-[#00ffb2]/35 bg-[#00ffb2]/10 px-4 py-2 text-[11px] text-[#00ffb2]"
              >
                Save changes
              </button>
            </div>
          )}
        </main>
      </div>

      {toast ? (
        <div
          role="status"
          className="pointer-events-none fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-lg border border-[#00ffb2]/40 bg-[#0a0f14]/95 px-4 py-2 text-[11px] text-[#00ffb2] shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}

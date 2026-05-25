import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demo Web App — DevFactory OS",
  description: "Hosted agent-built SaaS dashboard at /demo",
};

/** Standalone layout — no OS chrome; covers marketing grid background. */
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <div className="demo-route-host relative min-h-[100dvh]">{children}</div>;
}

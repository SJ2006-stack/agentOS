import "server-only";

export interface BuildManifestFile {
  path: string;
  content: string;
}

/** Fallback web shell when Gemini build fails or key is unset. */
export const DEMO_WEB_SHELL_FILES: BuildManifestFile[] = [
  {
    path: "app/layout.tsx",
    content: `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Dashboard",
  description: "DevFactory OS demo shell",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
`,
  },
  {
    path: "app/globals.css",
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --accent: #00ffb2;
  --bg: #0a0f14;
  --panel: rgba(255, 255, 255, 0.06);
}

body {
  background: var(--bg);
  color: #e2e8f0;
  font-family: ui-monospace, monospace;
}

.hero {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 2rem;
  background: radial-gradient(ellipse at top, rgba(0, 255, 178, 0.08), transparent 55%);
}

.hero h1 {
  font-size: clamp(1.75rem, 4vw, 2.75rem);
  color: var(--accent);
  letter-spacing: 0.04em;
}

.hero p {
  max-width: 36rem;
  text-align: center;
  color: #94a3b8;
  line-height: 1.6;
}

.badge {
  border: 1px solid rgba(0, 255, 178, 0.35);
  background: var(--panel);
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--accent);
}
`,
  },
  {
    path: "components/Hero.tsx",
    content: `"use client";

export function Hero() {
  return (
    <main className="hero">
      <span className="badge">DevFactory OS</span>
      <h1>Agent Dashboard Shell</h1>
      <p>
        Multi-agent pipeline assembled this shell — CPU orchestration, GPU workers,
        and live code streaming from the workspace.
      </p>
    </main>
  );
}
`,
  },
  {
    path: "app/page.tsx",
    content: `import { Hero } from "@/components/Hero";

export default function Page() {
  return <Hero />;
}
`,
  },
  {
    path: "preview.html",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Agent Dashboard</title>
  <style>
    :root { --accent: #00ffb2; --bg: #0a0f14; }
    * { box-sizing: border-box; margin: 0; }
    body {
      background: var(--bg);
      color: #e2e8f0;
      font-family: ui-monospace, monospace;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1.5rem;
      padding: 2rem;
      background-image: radial-gradient(ellipse at top, rgba(0,255,178,0.08), transparent 55%);
    }
    .badge {
      border: 1px solid rgba(0,255,178,0.35);
      background: rgba(255,255,255,0.06);
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.18em;
      color: var(--accent);
    }
    h1 { font-size: 2rem; color: var(--accent); letter-spacing: 0.04em; }
    p { max-width: 36rem; text-align: center; color: #94a3b8; line-height: 1.6; }
  </style>
</head>
<body>
  <span class="badge">DevFactory OS</span>
  <h1>Agent Dashboard Shell</h1>
  <p>Multi-agent pipeline assembled this shell — CPU orchestration, GPU workers, and live code streaming from the workspace.</p>
</body>
</html>`,
  },
];

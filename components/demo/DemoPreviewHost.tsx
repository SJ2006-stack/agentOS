"use client";

type DemoPreviewHostProps = {
  html: string;
};

/** Full-viewport hosted preview from Gemini build (no AgentOS chrome). */
export function DemoPreviewHost({ html }: DemoPreviewHostProps) {
  return (
    <iframe
      title="Generated demo web app"
      srcDoc={html}
      className="fixed inset-0 z-20 h-[100dvh] w-full border-0 bg-[#0a0f14]"
      sandbox="allow-scripts allow-same-origin"
    />
  );
}

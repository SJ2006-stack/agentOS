"use client";

import { FlickeringGridBackground } from "@/components/FlickeringGridBackground";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full bg-[#080c14] font-mono text-os-green antialiased">
        <FlickeringGridBackground />
        <div className="relative z-10 flex min-h-full flex-col items-center justify-center gap-4 p-8">
          <h1>Something went wrong</h1>
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}

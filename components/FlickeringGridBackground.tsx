"use client";

import { FlickeringGrid } from "@/components/ui/flickering-grid";

/** Global viewport flickering grid — mounted from root layout. */
export function FlickeringGridBackground() {
  return (
    <FlickeringGrid
      className="fixed inset-0 z-0 h-screen w-screen"
      color="rgb(100, 116, 139)"
      maxOpacity={0.15}
      flickerChance={0.2}
      squareSize={4}
      gridGap={6}
      aria-hidden
    />
  );
}

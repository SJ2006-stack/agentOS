"use client";

import { DoomDemoModal } from "@/components/hero/doom/DoomDemoModal";

/** E2E fixture — mounts DOOM demo modal (not yet wired in main OS UI). */
export default function E2eDoomDemoFixturePage() {
  return <DoomDemoModal open onClose={() => undefined} />;
}

"use client";

import { useEffect, useState } from "react";

/** Smooth typewriter reveal for streamed chunk content. */
export function useTypewriterChunks(
  content: string,
  active: boolean,
  charsPerTick = 3,
  intervalMs = 16
): string {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    if (!active) {
      setDisplayed(content);
      return;
    }

    setDisplayed("");
    let i = 0;
    const timer = setInterval(() => {
      i = Math.min(content.length, i + charsPerTick);
      setDisplayed(content.slice(0, i));
      if (i >= content.length) clearInterval(timer);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [content, active, charsPerTick, intervalMs]);

  return active ? displayed : content;
}

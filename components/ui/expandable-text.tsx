"use client";

import { useEffect, useRef, useState } from "react";
import { RippleButton } from "@/components/ui/ripple-button";
import { cn } from "@/lib/utils";

const CLAMP_CLASS = {
  2: "line-clamp-2",
  3: "line-clamp-3",
} as const;

export function ExpandableText({
  text,
  maxLines = 3,
  className,
  moreLabel = "…more",
  lessLabel = "less",
}: {
  text: string;
  maxLines?: 2 | 3;
  className?: string;
  moreLabel?: string;
  lessLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (expanded) return;
    const el = ref.current;
    if (!el) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text, maxLines, expanded]);

  return (
    <div className={cn("min-w-0", className)}>
      <p
        ref={ref}
        className={cn(
          "break-words whitespace-pre-wrap",
          !expanded && CLAMP_CLASS[maxLines]
        )}
      >
        {text}
      </p>
      {overflows && (
        <RippleButton
          type="button"
          rippleColor="var(--os-amber)"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 text-[9px] text-os-amber hover:underline"
        >
          {expanded ? lessLabel : moreLabel}
        </RippleButton>
      )}
    </div>
  );
}

/** Pull a readable label from JSON-ish memory preview strings. */
export function formatMemoryPreview(preview: string): string {
  const trimmed = preview.trim();
  if (!trimmed) return preview;

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.entries(parsed as Record<string, unknown>)
          .map(([key, value]) => {
            const val =
              typeof value === "string" ? value : JSON.stringify(value);
            return `${key}: ${val}`;
          })
          .join("\n");
      }
    } catch {
      const partial = trimmed.match(/"([^"]+)":\s*"([^"]*)/);
      if (partial) return `${partial[1]}: ${partial[2]}`;
    }
  }

  const firstLine = trimmed.split(/\r?\n/)[0] ?? trimmed;
  return firstLine;
}

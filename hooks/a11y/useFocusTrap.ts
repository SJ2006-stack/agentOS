"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.offsetParent !== null
  );
}

/** Trap Tab focus inside `containerRef` while `active`; restore focus to the opener on deactivate. */
export function useFocusTrap(
  active: boolean,
  containerRef: React.RefObject<HTMLElement | null>
) {
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const root = containerRef.current;
    if (!root) return;

    const focusables = getFocusableElements(root);
    const initial = focusables[0] ?? root;
    requestAnimationFrame(() => initial.focus());

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !containerRef.current) return;

      const items = getFocusableElements(containerRef.current);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        if (activeEl === first || !containerRef.current.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !containerRef.current.contains(activeEl)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const target = returnFocusRef.current;
      if (target?.isConnected) {
        requestAnimationFrame(() => target.focus());
      }
      returnFocusRef.current = null;
    };
  }, [active, containerRef]);
}

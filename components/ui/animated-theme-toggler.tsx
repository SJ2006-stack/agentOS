"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync, createPortal } from "react-dom";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/api/url";
import { cn } from "@/lib/utils";

const THEME_FALLBACK_MS = 3500;
const LIGHTNING_DURATION_MS = 520;
const AUDIO_END_THRESHOLD_S = 0.12;
const ZA_WARUDO_SRC = "/sounds/za-warudo.mp3";
const ZA_WARUDO_URL = withBasePath(ZA_WARUDO_SRC);

export type TransitionVariant =
  | "circle"
  | "square"
  | "triangle"
  | "diamond"
  | "hexagon"
  | "rectangle"
  | "star";

interface AnimatedThemeTogglerProps extends React.ComponentPropsWithoutRef<"button"> {
  duration?: number;
  variant?: TransitionVariant;
  /** When true, the transition expands from the viewport center instead of the button center. */
  fromCenter?: boolean;
}

function polygonCollapsed(cx: number, cy: number, vertexCount: number): string {
  const pairs = Array.from(
    { length: vertexCount },
    () => `${cx}px ${cy}px`
  ).join(", ");
  return `polygon(${pairs})`;
}

function getThemeTransitionClipPaths(
  variant: TransitionVariant,
  cx: number,
  cy: number,
  maxRadius: number,
  viewportWidth: number,
  viewportHeight: number
): [string, string] {
  switch (variant) {
    case "circle":
      return [
        `circle(0px at ${cx}px ${cy}px)`,
        `circle(${maxRadius}px at ${cx}px ${cy}px)`,
      ];
    case "square": {
      const halfW = Math.max(cx, viewportWidth - cx);
      const halfH = Math.max(cy, viewportHeight - cy);
      const halfSide = Math.max(halfW, halfH) * 1.05;
      const end = [
        `${cx - halfSide}px ${cy - halfSide}px`,
        `${cx + halfSide}px ${cy - halfSide}px`,
        `${cx + halfSide}px ${cy + halfSide}px`,
        `${cx - halfSide}px ${cy + halfSide}px`,
      ].join(", ");
      return [polygonCollapsed(cx, cy, 4), `polygon(${end})`];
    }
    case "triangle": {
      const scale = maxRadius * 2.2;
      const dx = (Math.sqrt(3) / 2) * scale;
      const verts = [
        `${cx}px ${cy - scale}px`,
        `${cx + dx}px ${cy + 0.5 * scale}px`,
        `${cx - dx}px ${cy + 0.5 * scale}px`,
      ].join(", ");
      return [polygonCollapsed(cx, cy, 3), `polygon(${verts})`];
    }
    case "diamond": {
      const R = maxRadius * Math.SQRT2;
      const end = [
        `${cx}px ${cy - R}px`,
        `${cx + R}px ${cy}px`,
        `${cx}px ${cy + R}px`,
        `${cx - R}px ${cy}px`,
      ].join(", ");
      return [polygonCollapsed(cx, cy, 4), `polygon(${end})`];
    }
    case "hexagon": {
      const R = maxRadius * Math.SQRT2;
      const verts: string[] = [];
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 3;
        verts.push(`${cx + R * Math.cos(a)}px ${cy + R * Math.sin(a)}px`);
      }
      return [polygonCollapsed(cx, cy, 6), `polygon(${verts.join(", ")})`];
    }
    case "rectangle": {
      const halfW = Math.max(cx, viewportWidth - cx);
      const halfH = Math.max(cy, viewportHeight - cy);
      const end = [
        `${cx - halfW}px ${cy - halfH}px`,
        `${cx + halfW}px ${cy - halfH}px`,
        `${cx + halfW}px ${cy + halfH}px`,
        `${cx - halfW}px ${cy + halfH}px`,
      ].join(", ");
      return [polygonCollapsed(cx, cy, 4), `polygon(${end})`];
    }
    case "star": {
      const R = maxRadius * Math.SQRT2 * 1.03;
      const innerRatio = 0.42;
      const starPolygon = (radius: number) => {
        const verts: string[] = [];
        for (let i = 0; i < 5; i++) {
          const outerA = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
          verts.push(
            `${cx + radius * Math.cos(outerA)}px ${cy + radius * Math.sin(outerA)}px`
          );
          const innerA = outerA + Math.PI / 5;
          verts.push(
            `${cx + radius * innerRatio * Math.cos(innerA)}px ${cy + radius * innerRatio * Math.sin(innerA)}px`
          );
        }
        return `polygon(${verts.join(", ")})`;
      };
      const startR = Math.max(2, R * 0.025);
      return [starPolygon(startR), starPolygon(R)];
    }
    default:
      return [
        `circle(0px at ${cx}px ${cy}px)`,
        `circle(${maxRadius}px at ${cx}px ${cy}px)`,
      ];
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const AnimatedThemeToggler = ({
  className,
  duration = 400,
  variant,
  fromCenter = false,
  ...props
}: AnimatedThemeTogglerProps) => {
  const shape = variant ?? "circle";
  const [isDark, setIsDark] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [showLightning, setShowLightning] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pendingRef = useRef(false);
  const themeApplyTriggeredRef = useRef(false);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lightningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zaWarudoRef = useRef<HTMLAudioElement | null>(null);
  const zaWarudoReadyRef = useRef(false);
  const zaWarudoPlayFailedLoggedRef = useRef(false);

  const playZaWarudo = useCallback(() => {
    const audio = zaWarudoRef.current;
    if (!audio || audio.error) return;

    try {
      audio.pause();
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        void playPromise.catch(() => {
          if (
            process.env.NODE_ENV === "development" &&
            !zaWarudoPlayFailedLoggedRef.current
          ) {
            zaWarudoPlayFailedLoggedRef.current = true;
            console.warn("[ZA WARUDO] playback unavailable (autoplay or codec)");
          }
        });
      }
    } catch {
      if (
        process.env.NODE_ENV === "development" &&
        !zaWarudoPlayFailedLoggedRef.current
      ) {
        zaWarudoPlayFailedLoggedRef.current = true;
        console.warn("[ZA WARUDO] playback unavailable (autoplay or codec)");
      }
    }
  }, []);

  const onZaWarudoCanPlayThrough = useCallback(() => {
    zaWarudoReadyRef.current = true;
  }, []);

  const onZaWarudoError = useCallback(() => {
    zaWarudoReadyRef.current = false;
  }, []);

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearAudioEndListeners = useCallback(() => {
    const audio = zaWarudoRef.current;
    if (!audio) return;
    audio.onended = null;
    audio.ontimeupdate = null;
  }, []);

  const clearThemeApplySchedule = useCallback(() => {
    if (fallbackTimeoutRef.current !== null) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    clearAudioEndListeners();
  }, [clearAudioEndListeners]);

  useEffect(() => {
    return () => {
      clearThemeApplySchedule();
      if (lightningTimeoutRef.current !== null) {
        clearTimeout(lightningTimeoutRef.current);
      }
    };
  }, [clearThemeApplySchedule]);

  const applyTheme = useCallback(() => {
    const currentlyDark = document.documentElement.classList.contains("dark");
    const newTheme = !currentlyDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  }, []);

  const runViewTransition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) {
      applyTheme();
      return;
    }

    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;

    let x: number;
    let y: number;
    if (fromCenter) {
      x = viewportWidth / 2;
      y = viewportHeight / 2;
    } else {
      const { top, left, width, height } = button.getBoundingClientRect();
      x = left + width / 2;
      y = top + height / 2;
    }

    const maxRadius = Math.hypot(
      Math.max(x, viewportWidth - x),
      Math.max(y, viewportHeight - y)
    );

    if (typeof document.startViewTransition !== "function") {
      applyTheme();
      return;
    }

    let transition: ViewTransition;
    try {
      transition = document.startViewTransition(() => {
        flushSync(applyTheme);
      });
    } catch {
      applyTheme();
      return;
    }

    const clipPath = getThemeTransitionClipPaths(
      shape,
      x,
      y,
      maxRadius,
      viewportWidth,
      viewportHeight
    );

    const root = document.documentElement;
    root.dataset.magicuiThemeVt = "active";
    root.style.setProperty(
      "--magicui-theme-toggle-vt-duration",
      `${duration}ms`
    );
    root.style.setProperty("--magicui-theme-vt-clip-from", clipPath[0]);
    const cleanup = () => {
      delete root.dataset.magicuiThemeVt;
      root.style.removeProperty("--magicui-theme-toggle-vt-duration");
      root.style.removeProperty("--magicui-theme-vt-clip-from");
    };

    if (typeof transition?.finished?.finally === "function") {
      transition.finished.finally(cleanup);
    } else {
      cleanup();
    }

    const ready = transition?.ready;
    if (ready && typeof ready.then === "function") {
      ready.then(() => {
        document.documentElement.animate(
          {
            clipPath,
          },
          {
            duration,
            easing: shape === "star" ? "linear" : "ease-in-out",
            fill: "forwards",
            pseudoElement: "::view-transition-new(root)",
          }
        );
      });
    }
  }, [shape, fromCenter, duration, applyTheme]);

  const triggerLightning = useCallback(() => {
    if (prefersReducedMotion()) return;

    setShowLightning(true);
    if (lightningTimeoutRef.current !== null) {
      clearTimeout(lightningTimeoutRef.current);
    }
    lightningTimeoutRef.current = setTimeout(() => {
      setShowLightning(false);
      lightningTimeoutRef.current = null;
    }, LIGHTNING_DURATION_MS);
  }, []);

  const finalizeThemeChange = useCallback(() => {
    if (!pendingRef.current || themeApplyTriggeredRef.current) return;

    themeApplyTriggeredRef.current = true;
    clearThemeApplySchedule();
    pendingRef.current = false;
    setIsPending(false);

    const reducedMotion = prefersReducedMotion();
    if (reducedMotion) {
      applyTheme();
      return;
    }

    triggerLightning();
    runViewTransition();
  }, [
    applyTheme,
    runViewTransition,
    clearThemeApplySchedule,
    triggerLightning,
  ]);

  const scheduleThemeApplyFromAudio = useCallback(() => {
    clearThemeApplySchedule();
    themeApplyTriggeredRef.current = false;

    fallbackTimeoutRef.current = setTimeout(() => {
      fallbackTimeoutRef.current = null;
      finalizeThemeChange();
    }, THEME_FALLBACK_MS);

    const audio = zaWarudoRef.current;
    if (!audio || audio.error) return;

    const onAudioNearEnd = () => {
      if (
        Number.isFinite(audio.duration) &&
        audio.duration > 0 &&
        audio.duration - audio.currentTime <= AUDIO_END_THRESHOLD_S
      ) {
        finalizeThemeChange();
      }
    };

    audio.onended = () => {
      finalizeThemeChange();
    };
    audio.ontimeupdate = onAudioNearEnd;
  }, [clearThemeApplySchedule, finalizeThemeChange]);

  const toggleTheme = useCallback(() => {
    if (pendingRef.current) return;

    const button = buttonRef.current;
    if (!button) return;

    pendingRef.current = true;
    themeApplyTriggeredRef.current = false;
    setIsPending(true);

    playZaWarudo();
    scheduleThemeApplyFromAudio();
  }, [playZaWarudo, scheduleThemeApplyFromAudio]);

  const lightningOverlay =
    mounted && showLightning
      ? createPortal(
          <div className="theme-lightning-overlay" aria-hidden>
            <div className="theme-lightning-burst" aria-hidden />
            <div className="theme-lightning-jagged" aria-hidden />
          </div>,
          document.body
        )
      : null;

  return (
    <>
    {lightningOverlay}
    <audio
      ref={zaWarudoRef}
      src={ZA_WARUDO_URL}
      preload="auto"
      className="hidden"
      aria-hidden
      onCanPlayThrough={onZaWarudoCanPlayThrough}
      onError={onZaWarudoError}
    />
    <Button
      type="button"
      ref={buttonRef}
      onClick={toggleTheme}
      disabled={isPending}
      aria-busy={isPending}
      className={cn(
        "group theme-toggler-pulse fixed top-3 left-1/2 z-[100] -translate-x-1/2",
        "flex min-h-11 min-w-11 items-center justify-center rounded-full",
        "border border-os-green bg-os-surface/90 shadow-md backdrop-blur-sm",
        "transition-[box-shadow,ring-color,border-color] duration-200",
        "hover:ring-2 hover:ring-os-green/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-green/60",
        isPending && "cursor-wait opacity-80",
        className
      )}
      {...props}
    >
      {isPending ? (
        <span className="text-[9px] font-bold tracking-widest text-os-amber/70">
          ...
        </span>
      ) : isDark ? (
        <Sun
          className="size-[21px] shrink-0 text-os-green"
          strokeWidth={2.25}
          aria-hidden
        />
      ) : (
        <Moon
          className="size-[21px] shrink-0 text-os-cyan"
          strokeWidth={2.25}
          aria-hidden
        />
      )}
      {isPending ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-center justify-center text-[7px] font-bold uppercase tracking-[0.2em] text-os-amber/25"
        >
          ZA WARUDO
        </span>
      ) : null}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap",
          "rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
          "border border-os-border/80 bg-os-surface/95 text-os-dim opacity-0",
          "transition-opacity duration-150 group-hover:opacity-100"
        )}
      >
        Theme
      </span>
      <span className="sr-only">
        {isPending ? "Theme change in progress" : "Toggle theme"}
      </span>
    </Button>
    </>
  );
};

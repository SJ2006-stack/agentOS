"use client";

import React, { MouseEvent, useCallback, useEffect, useRef, useState } from "react";

import {
  applyParticleEffect,
  DEFAULT_COOL_MODE_OPTIONS,
  type CoolParticleOptions,
} from "@/components/ui/cool-mode";
import { cn } from "@/lib/utils";

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  rippleColor?: string;
  duration?: string;
  /** Particle burst on press/hold. Pass `false` to disable (e.g. terminal chrome). */
  coolMode?: boolean | CoolParticleOptions;
}

export const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  (
    {
      className,
      children,
      rippleColor = "#ffffff",
      duration = "600ms",
      coolMode = DEFAULT_COOL_MODE_OPTIONS,
      onClick,
      ...props
    },
    ref
  ) => {
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const [buttonRipples, setButtonRipples] = useState<
      Array<{ x: number; y: number; size: number; key: number }>
    >([]);

    const setButtonRef = useCallback(
      (node: HTMLButtonElement | null) => {
        buttonRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    useEffect(() => {
      const el = buttonRef.current;
      if (!el || coolMode === false) return;
      const options =
        coolMode === true ? DEFAULT_COOL_MODE_OPTIONS : coolMode;
      return applyParticleEffect(el, options);
    }, [coolMode]);

    const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
      createRipple(event);
      onClick?.(event);
    };

    const createRipple = (event: MouseEvent<HTMLButtonElement>) => {
      const button = event.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = event.clientX - rect.left - size / 2;
      const y = event.clientY - rect.top - size / 2;

      const newRipple = { x, y, size, key: Date.now() };
      setButtonRipples((prevRipples) => [...prevRipples, newRipple]);
    };

    useEffect(() => {
      let timeout: ReturnType<typeof setTimeout> | null = null;

      if (buttonRipples.length > 0) {
        const lastRipple = buttonRipples[buttonRipples.length - 1];
        timeout = setTimeout(() => {
          setButtonRipples((prevRipples) =>
            prevRipples.filter((ripple) => ripple.key !== lastRipple.key)
          );
        }, parseInt(duration));
      }

      return () => {
        if (timeout !== null) {
          clearTimeout(timeout);
        }
      };
    }, [buttonRipples, duration]);

    return (
      <button
        className={cn(
          "relative flex cursor-pointer items-center justify-center overflow-hidden text-center",
          className
        )}
        onClick={handleClick}
        ref={setButtonRef}
        {...props}
      >
        <span className="relative z-10 contents">{children}</span>
        <span className="pointer-events-none absolute inset-0">
          {buttonRipples.map((ripple) => (
            <span
              className="animate-rippling absolute rounded-full opacity-30"
              key={ripple.key}
              style={
                {
                  width: `${ripple.size}px`,
                  height: `${ripple.size}px`,
                  top: `${ripple.y}px`,
                  left: `${ripple.x}px`,
                  backgroundColor: rippleColor,
                  transform: "scale(0)",
                  "--duration": duration,
                } as React.CSSProperties
              }
            />
          ))}
        </span>
      </button>
    );
  }
);
RippleButton.displayName = "RippleButton";

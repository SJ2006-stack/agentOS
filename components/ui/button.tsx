"use client";

import * as React from "react";
import { useCallback, useEffect, useRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import {
  applyParticleEffect,
  DEFAULT_COOL_MODE_OPTIONS,
  type CoolParticleOptions,
} from "@/components/ui/cool-mode";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-os-green/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-os-green text-os-bg hover:bg-os-green/90",
        outline:
          "border border-os-border bg-transparent text-os-green hover:bg-os-panel/80",
        ghost: "text-os-green hover:bg-os-panel/80",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Particle burst on press/hold. Pass `true` or options; omit to disable. */
  coolMode?: boolean | CoolParticleOptions;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, asChild = false, coolMode, ...props },
    ref
  ) => {
    const innerRef = useRef<HTMLButtonElement | null>(null);
    const setRef = useCallback(
      (node: HTMLButtonElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    );

    useEffect(() => {
      const el = innerRef.current;
      if (!el || coolMode === undefined || coolMode === false || asChild) {
        return;
      }
      const options =
        coolMode === true ? DEFAULT_COOL_MODE_OPTIONS : coolMode;
      return applyParticleEffect(el, options);
    }, [coolMode, asChild]);

    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={asChild ? ref : setRef}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

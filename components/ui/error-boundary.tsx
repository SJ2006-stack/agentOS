"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `[error-boundary${this.props.label ? `: ${this.props.label}` : ""}]`,
      error,
      info.componentStack
    );
  }

  handleRetry = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      const message =
        this.state.error.message.trim() || "An unexpected error occurred.";

      return (
        <div
          className={cn(
            "flex h-full min-h-[120px] flex-col items-center justify-center gap-3 rounded-lg border border-os-border/60 bg-os-panel/40 p-4 font-mono text-[11px]",
            this.props.className
          )}
          role="alert"
        >
          <p className="text-center text-os-fault">
            {this.props.label
              ? `${this.props.label} failed to load`
              : "Something went wrong"}
          </p>
          <p className="max-w-sm text-center text-os-dim">{message}</p>
          <Button
            type="button"
            onClick={this.handleRetry}
            className="rounded-md border border-os-border/70 bg-os-bg/30 px-3 py-1.5 text-[10px] uppercase tracking-wide text-os-amber transition-[background-color,box-shadow] hover:border-os-amber/40 hover:bg-os-amber/10"
          >
            <span className="text-center text-os-amber">Retry</span>
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

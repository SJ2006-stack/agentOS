"use client";

import * as React from "react";
import { DayPicker, type DayPickerProps } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = DayPickerProps;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-2 font-mono text-os-green", className)}
      classNames={{
        months: "flex flex-col gap-2",
        month: "flex flex-col gap-2",
        month_caption: "flex justify-center pt-1 relative items-center text-xs font-medium text-os-green",
        caption_label: "text-xs",
        nav: "flex items-center gap-1",
        button_previous: cn(
          "absolute left-1 size-6 rounded border border-os-border bg-os-panel text-os-dim hover:text-os-green"
        ),
        button_next: cn(
          "absolute right-1 size-6 rounded border border-os-border bg-os-panel text-os-dim hover:text-os-green"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 text-[10px] font-normal text-os-dim",
        week: "flex w-full mt-1",
        day: "relative p-0 text-center text-xs",
        day_button: cn(
          "size-7 rounded border border-transparent p-0 font-normal text-os-green hover:border-os-border hover:bg-os-panel"
        ),
        selected:
          "bg-os-green/15 border-os-green/40 [&_button]:border-os-green/50 [&_button]:text-os-green",
        today: "[&_button]:border-os-amber/50 [&_button]:text-os-amber",
        outside: "text-os-dim/40",
        disabled: "text-os-dim/30",
        hidden: "invisible",
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };

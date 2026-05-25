import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { ArrowRightIcon } from "@radix-ui/react-icons";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  className: string;
  background: ReactNode;
  Icon: React.ElementType;
  description: string;
  href: string;
  cta: string;
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[minmax(11rem,1fr)] grid-cols-1 gap-3 sm:auto-rows-[12rem] sm:grid-cols-2 sm:gap-3 lg:grid-cols-3 lg:auto-rows-[11rem] lg:gap-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-1 flex flex-col justify-between overflow-hidden rounded-lg border border-os-border bg-os-panel",
      className
    )}
    {...props}
  >
    <div className="absolute inset-0">{background}</div>
    <div className="relative z-10 mt-auto p-3">
      <div className="pointer-events-none flex transform-gpu flex-col gap-0.5 transition-all duration-300 lg:group-hover:-translate-y-1">
        <Icon className="size-8 text-os-green/80 transition-all duration-300 group-hover:text-os-green" />
        <h3 className="text-sm font-semibold tracking-tight text-os-green">{name}</h3>
        <p className="max-w-lg text-xs leading-snug text-os-dim">{description}</p>
      </div>

      <div className="pointer-events-none flex w-full translate-y-0 transform-gpu flex-row items-center transition-all duration-300 lg:hidden">
        <Button variant="ghost" asChild size="sm" className="pointer-events-auto h-auto p-0 hover:bg-transparent">
          <a href={href}>
            {cta}
            <ArrowRightIcon className="ms-1.5 size-3.5" />
          </a>
        </Button>
      </div>
    </div>

    <div
      className={cn(
        "pointer-events-none absolute bottom-0 hidden w-full translate-y-6 transform-gpu flex-row items-center p-3 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex"
      )}
    >
      <Button variant="ghost" asChild size="sm" className="pointer-events-auto h-auto p-0 hover:bg-transparent">
        <a href={href}>
          {cta}
          <ArrowRightIcon className="ms-1.5 size-3.5" />
        </a>
      </Button>
    </div>
  </div>
);

export { BentoCard, BentoGrid };

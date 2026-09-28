import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/* pílula única (chips de resumo, tags, rótulos de degrau) */

const SIZE = { sm: "h-7 px-3 text-xs", md: "h-11 px-4 text-sm" } as const;

const TONE = {
  outline: "border border-border bg-card text-ink-2",
  solid: "bg-primary text-primary-foreground shadow-cta",
  accent: "bg-accent text-accent-foreground",
} as const;

export function Pill({
  size = "md",
  tone = "outline",
  className,
  ...props
}: ComponentProps<"span"> & { size?: keyof typeof SIZE; tone?: keyof typeof TONE }) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 rounded-full font-bold whitespace-nowrap", SIZE[size], TONE[tone], className)}
      {...props}
    />
  );
}

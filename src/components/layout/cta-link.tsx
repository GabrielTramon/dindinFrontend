import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/*
  O botão de ação do dindin, como link. Uma cara só em todas as páginas:
  pílula, alto o suficiente pra dedo (48px), sem gradiente.
*/

type CtaLinkProps = ComponentProps<typeof Link> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
};

const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50";

const variants = {
  primary: "bg-primary text-primary-foreground hover:bg-brand-deep",
  secondary: "border border-border bg-card text-foreground hover:bg-muted",
  ghost: "text-ink-2 hover:bg-muted hover:text-foreground",
} as const;

const sizes = {
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base sm:h-13",
} as const;

export function CtaLink({ className, variant = "primary", size = "md", ...props }: CtaLinkProps) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}

/** Mesmas classes, pra usar em <button> nativo. */
export function ctaClasses(variant: keyof typeof variants = "primary", size: keyof typeof sizes = "md") {
  return cn(base, variants[variant], sizes[size]);
}

import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/*
  O botão de ação do dindin, como link. Uma cara só em todas as páginas:
  pílula, alto o suficiente pra dedo (48px), sem gradiente. A transição é do
  `press` (nunca somar transition-* do Tailwind); o glow do primary/inverse é
  do `glow-cta`. `transitionTypes` (direção da view transition) passa por
  ...props, como qualquer prop do Link.
*/

type CtaLinkProps = ComponentProps<typeof Link> & {
  variant?: "primary" | "secondary" | "ghost" | "inverse";
  size?: "md" | "lg";
};

const base =
  "press inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap outline-none select-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none";

const variants = {
  primary: "glow-cta bg-primary text-primary-foreground hover:bg-brand-deep",
  secondary:
    "border border-border bg-card text-foreground shadow-card hover:border-border-strong hover:bg-accent",
  ghost: "text-ink-2 hover:bg-accent hover:text-foreground",
  inverse:
    // dentro do bloco brand-block: hover por cor (entra na transição do press) e anel de foco
    // com o par invertido — ring igual ao bloco seria invisível no claro (--ring == --brand-block)
    "glow-cta bg-brand-block-cta text-brand-block-cta-foreground hover:bg-brand-block-muted focus-visible:ring-brand-block-cta focus-visible:ring-offset-brand-block",
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

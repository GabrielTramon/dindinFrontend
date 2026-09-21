import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/*
  A receita única de card. `interactive` = press + glow-card (sombra esmeralda
  que acende no hover); `halo` = borda de luz girando alinhada sobre a border
  de 1px (só na Decisao e no card de exemplo).
*/

export function cardClasses(o: { interactive?: boolean; halo?: boolean } = {}) {
  return cn(
    "rounded-2xl border bg-card p-4 sm:p-5",
    o.interactive && "press glow-card",
    o.halo && "halo-border [--halo-offset:1px]",
  );
}

export function Card({
  interactive,
  halo,
  className,
  ...props
}: ComponentProps<"div"> & { interactive?: boolean; halo?: boolean }) {
  return <div className={cn(cardClasses({ interactive, halo }), className)} {...props} />;
}

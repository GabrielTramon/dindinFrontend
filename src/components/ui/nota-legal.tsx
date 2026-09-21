import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* disclaimer único (Aviso, MetaCard): texto pequeno sobre uma hairline */

export function NotaLegal({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("border-t pt-4 text-xs leading-relaxed text-muted-foreground", className)}>{children}</p>;
}

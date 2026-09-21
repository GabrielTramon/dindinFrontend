import type { CSSProperties, SVGProps } from "react";
import { cn } from "@/lib/utils";

/*
  Check e X que se desenham. Cada traço tem pathLength=1, por isso o utilitário
  icon-draw (dasharray 1) fecha o traço inteiro em qualquer comprimento.
  `delay` em ms vira --draw-delay.
*/

type Props = SVGProps<SVGSVGElement> & { delay?: number };

const comum = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

const atraso = (ms: number) => ({ "--draw-delay": `${ms}ms` }) as CSSProperties;

export function CheckDraw({ className, delay = 0, style, ...p }: Props) {
  return (
    <svg {...comum} className={cn("icon-draw size-4", className)} style={{ ...atraso(delay), ...style }} {...p}>
      <path pathLength={1} d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function XDraw({ className, delay = 0, style, ...p }: Props) {
  return (
    <svg {...comum} className={cn("icon-draw size-4", className)} style={{ ...atraso(delay), ...style }} {...p}>
      <path pathLength={1} d="M18 6 6 18" />
      <path pathLength={1} d="m6 6 12 12" />
    </svg>
  );
}

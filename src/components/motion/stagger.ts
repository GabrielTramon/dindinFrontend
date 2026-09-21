import type { CSSProperties } from "react";

/*
  Tipagem de custom properties em `style`. Todo stagger do app é
  `style={staggerStyle(i)}` (--i), lido pelos utilitários rise-in, rise-in-blur,
  enter-up, reveal, rule-draw, mark-warn, step-light, grow-in-x/w, escada-degrau.
*/

export function staggerStyle(i: number): CSSProperties {
  return { "--i": i } as CSSProperties;
}

export function cssVars(vars: Record<`--${string}`, string | number>): CSSProperties {
  return vars as CSSProperties;
}

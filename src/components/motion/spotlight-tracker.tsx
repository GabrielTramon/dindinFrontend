"use client";

import { useEffect } from "react";

/*
  Um pointermove global escreve --mx/--my no [data-spotlight] sob o cursor; o
  <span class="spotlight"> filho do card desenha o brilho. Só em dispositivo
  com hover. Montado uma vez, no root layout.
*/

export function SpotlightTracker() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    const mover = (e: PointerEvent) => {
      const alvo = (e.target as Element | null)?.closest<HTMLElement>("[data-spotlight]");
      if (!alvo) return;
      const r = alvo.getBoundingClientRect();
      alvo.style.setProperty("--mx", `${e.clientX - r.left}px`);
      alvo.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", mover, { passive: true });
    return () => window.removeEventListener("pointermove", mover);
  }, []);
  return null;
}

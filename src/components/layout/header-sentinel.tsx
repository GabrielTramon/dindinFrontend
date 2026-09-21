"use client";

import { useEffect, useRef } from "react";

/*
  Div de 1px no topo do documento, FORA do header (que é sticky). Quando ela sai
  da tela o header ganha data-scrolled (hairline + sombra), sem mudar de altura.
*/

export function HeaderSentinel({ headerId }: { headerId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const header = document.getElementById(headerId);
    if (!el || !header || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => {
      header.toggleAttribute("data-scrolled", !(e?.isIntersecting ?? true));
    });
    io.observe(el);
    return () => io.disconnect();
  }, [headerId]);
  return <div ref={ref} aria-hidden="true" className="absolute top-0 h-px w-px" />;
}

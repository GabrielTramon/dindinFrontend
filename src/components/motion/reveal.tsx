"use client";

import { useEffect, useRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { staggerStyle } from "./stagger";

/*
  Revela ao rolar (IntersectionObserver), sem motion. O utilitário `reveal` só
  esconde quando o html tem a classe js e o elemento ainda não tem data-shown;
  sem observer, o CSS revela sozinho aos 2.5s. `i` é o stagger (--i).
*/

type Tag = "div" | "li" | "section" | "article" | "h2" | "p";
type RevealProps = HTMLAttributes<HTMLElement> & { as?: Tag; i?: number };

export function Reveal({ as = "div", i = 0, className, style, ...rest }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.dataset.shown = "";
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          el.dataset.shown = "";
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // Tag dinâmica em JSX (não createElement): o lint do compiler reconhece o `ref`.
  // Tipada como "div" só pra tipagem: com a união de tags o TS intersecta os
  // tipos de ref e nenhum ref real satisfaz; o efeito só usa dataset (HTMLElement).
  const Tag = as as "div";
  return <Tag ref={ref} className={cn("reveal", className)} style={{ ...staggerStyle(i), ...style }} {...rest} />;
}

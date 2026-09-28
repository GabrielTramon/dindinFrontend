"use client";

import { useLayoutEffect, useRef } from "react";
import { formatBRL } from "@/lib/format";

/*
  Número que conta (rAF, ease-out-expo). O HTML do servidor já traz o valor
  final; o span visível é aria-hidden e o sr-only fixo carrega o valor pra
  leitores de tela. Regra: `format` deve ser função estável (nível de módulo),
  nunca inline — está nas dependências do efeito.
*/

interface CountUpProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  delay?: number;
  className?: string;
}

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));

export function CountUp({ value, format = formatBRL, duration = 900, delay = 0, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const anterior = useRef<number | null>(null); // por instância, nunca no módulo

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const de = anterior.current ?? 0;
    if (de === value || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      anterior.current = value;
      el.textContent = format(value);
      return;
    }
    // `mostrado` é o último número pintado: o cleanup devolve ele a `anterior`,
    // então o Strict Mode (efeito roda, limpa e roda de novo) recomeça do zero
    // em vez de achar que já chegou, e um valor que muda no meio da contagem
    // continua de onde estava em vez de saltar.
    let mostrado = de;
    el.textContent = format(de); // antes da pintura: sem piscar o valor final
    let raf = 0;
    let timer = 0;
    let inicio: number | null = null;
    const quadro = (agora: number) => {
      if (inicio === null) inicio = agora;
      const p = easeOutExpo(Math.min(1, (agora - inicio) / duration));
      mostrado = de + (value - de) * p;
      el.textContent = format(mostrado);
      if (p < 1) raf = requestAnimationFrame(quadro);
      else anterior.current = value;
    };
    const comecar = () => {
      timer = window.setTimeout(() => {
        raf = requestAnimationFrame(quadro);
      }, delay);
    };
    let io: IntersectionObserver | undefined;
    if (typeof IntersectionObserver === "undefined") comecar();
    else {
      io = new IntersectionObserver(([e]) => {
        if (e?.isIntersecting) {
          io?.disconnect();
          comecar();
        }
      });
      io.observe(el);
    }
    return () => {
      io?.disconnect();
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      anterior.current = mostrado;
    };
  }, [value, format, duration, delay]);

  return (
    <>
      <span ref={ref} aria-hidden="true" className={className}>
        {format(value)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}

"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Dica } from "@/components/layout/dica";
import { ICONE_DO_HEADER } from "@/components/layout/header-estilos";
import { staggerStyle } from "@/components/motion/stagger";
import { applyTheme, temaAtual, useThemeSync } from "./use-theme";

/*
  O único toggle de tema do site: botão redondo de 44px, sem texto visível
  (o botão-ícone do cabeçalho, com a Dica no hover).
  Os raios giram por rotate(a) SEM centro no atributo: a origem (12,12) vem do
  transform-origin: center do utilitário theme-icon — com rotate(a 12 12) os
  dois centros se somam e os raios giram em torno de (24,24), fora do ícone.
  Dois estados (claro/escuro), sem "sistema" na UI. O ícone sol→lua é 100%
  dirigido pela classe .dark do html (utilitário theme-icon): zero estado
  React, zero mismatch de hidratação.
*/

const RAIOS = [0, 1, 2, 3, 4, 5, 6, 7];

export function ThemeToggle({ className }: { className?: string }) {
  useThemeSync();
  const mascara = useId();
  const botao = useRef<HTMLButtonElement>(null);
  const [anuncio, setAnuncio] = useState("");

  function alternar() {
    const proximo = temaAtual() === "dark" ? "light" : "dark";
    const r = botao.current?.getBoundingClientRect();
    void applyTheme(proximo, r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined);
    setAnuncio(proximo === "dark" ? "Tema escuro ativado" : "Tema claro ativado");
  }

  return (
    <>
      <button
        ref={botao}
        type="button"
        onClick={alternar}
        className={cn(ICONE_DO_HEADER, className)}
      >
        <span className="sr-only dark:hidden">Mudar para o tema escuro</span>
        <span className="sr-only hidden dark:inline">Mudar para o tema claro</span>
        <Dica>
          <span className="dark:hidden">Tema escuro</span>
          <span className="hidden dark:inline">Tema claro</span>
        </Dica>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="theme-icon size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <mask id={mascara}>
            <rect width="24" height="24" fill="white" />
            <circle className="mask-circle" cx="26" cy="-2" r="9" fill="black" />
          </mask>
          <g className="icon">
            <circle className="core" cx="12" cy="12" r="5" fill="currentColor" stroke="none" mask={`url(#${mascara})`} />
            {RAIOS.map((i) => (
              <line
                key={i}
                className="ray"
                style={staggerStyle(i)}
                x1="12"
                y1="2"
                x2="12"
                y2="4"
                transform={`rotate(${i * 45})`}
              />
            ))}
          </g>
        </svg>
      </button>
      <span aria-live="polite" className="sr-only">
        {anuncio}
      </span>
    </>
  );
}

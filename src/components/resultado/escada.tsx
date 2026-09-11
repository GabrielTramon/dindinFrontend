"use client";

import { Check } from "lucide-react";
import { useEffect, useRef } from "react";
import { ROTULO_DEGRAU, type Degrau } from "@/domain";
import { cn } from "@/lib/utils";

/*
  A cascata como stepper: o que já está resolvido, onde a pessoa está e o
  que vem depois. No celular rola na horizontal e centraliza o degrau atual;
  em telas maiores quebra linha se precisar, sem barra de rolagem.
*/

const DEGRAUS: Degrau[] = [0, 1, 2, 3, 4];

type Situacao = "resolvido" | "atual" | "depois";

function situacaoDe(d: Degrau, atual: Degrau): Situacao {
  if (d < atual) return "resolvido";
  if (d === atual) return "atual";
  return "depois";
}

export function Escada({ degrau }: { degrau: Degrau }) {
  const listaRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const lista = listaRef.current;
    const atual = lista?.querySelector<HTMLElement>("[aria-current='step']");
    if (!lista || !atual) return;
    lista.scrollLeft = atual.offsetLeft - lista.clientWidth / 2 + atual.clientWidth / 2;
  }, [degrau]);

  return (
    <section aria-label="A escada de prioridades">
      <ol
        ref={listaRef}
        className="relative -mx-4 flex snap-x gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
      >
        {DEGRAUS.map((d) => {
          const situacao = situacaoDe(d, degrau);
          return (
            <li
              key={d}
              aria-current={situacao === "atual" ? "step" : undefined}
              className={cn(
                "flex shrink-0 snap-center items-center gap-2 rounded-full px-3 py-2 text-sm font-bold whitespace-nowrap",
                situacao === "atual" && "bg-primary text-primary-foreground",
                situacao === "resolvido" && "text-foreground",
                situacao === "depois" && "text-muted-foreground",
              )}
            >
              {situacao === "resolvido" && (
                <>
                  <Check className="size-4 text-primary" aria-hidden="true" />
                  <span className="sr-only">Resolvido:</span>
                </>
              )}
              <span className="text-xs tnum">0{d}</span>
              <span>{ROTULO_DEGRAU[d]}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

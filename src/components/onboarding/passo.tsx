"use client";

import { m } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { CHILD } from "@/components/motion/springs";

/*
  A moldura de uma pergunta: título, ajuda e o controle (a linha de erro fica
  no controle, colada no campo). Sem card em volta — a pergunta é a tela. Ao
  trocar de passo, o foco vai pro título, a não ser que um controle com
  autoFocus já tenha pedido.

  A entrada/saída do passo é do m.div pai (onboarding.tsx, AnimatePresence);
  título+ajuda e o controle são filhos CHILD e herdam enter/center do pai,
  chegando em cascata de 60ms. Sem rise-words aqui: o h1 recebe foco.
*/

export interface PassoIds {
  titulo: string;
  ajuda: string;
}

interface PassoProps {
  /** id do passo; quando muda, o foco é reposicionado */
  id: string;
  pergunta: string;
  ajuda?: string;
  ids: PassoIds;
  children: ReactNode;
}

export function Passo({ id, pergunta, ajuda, ids, children }: PassoProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const ativo = document.activeElement;
    if (ativo && ativo !== document.body && raiz.current?.contains(ativo)) return;
    titulo.current?.focus();
  }, [id]);

  return (
    <div ref={raiz} className="grid min-w-0 gap-8">
      <m.div variants={CHILD} className="grid min-w-0 gap-3">
        <h1
          ref={titulo}
          id={ids.titulo}
          tabIndex={-1}
          className="text-3xl font-extrabold tracking-tight outline-none sm:text-4xl"
        >
          {pergunta}
        </h1>
        {ajuda && (
          <p id={ids.ajuda} className="text-base text-ink-2">
            {ajuda}
          </p>
        )}
      </m.div>

      <m.div variants={CHILD} className="grid min-w-0 gap-3">
        {children}
      </m.div>
    </div>
  );
}

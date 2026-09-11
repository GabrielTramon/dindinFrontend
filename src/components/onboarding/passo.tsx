"use client";

import { useEffect, useRef, type ReactNode } from "react";

/*
  A moldura de uma pergunta: título, ajuda e o controle (a linha de erro fica
  no controle, colada no campo). Sem card em volta — a pergunta é a tela. Ao
  trocar de passo, o foco vai pro título, a não ser que um controle com
  autoFocus já tenha pedido.
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
    <div
      ref={raiz}
      className="grid min-w-0 gap-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
    >
      <div className="grid min-w-0 gap-3">
        <h1
          ref={titulo}
          id={ids.titulo}
          tabIndex={-1}
          className="text-2xl font-extrabold tracking-tight outline-none sm:text-3xl"
        >
          {pergunta}
        </h1>
        {ajuda && (
          <p id={ids.ajuda} className="text-base text-muted-foreground">
            {ajuda}
          </p>
        )}
      </div>

      <div className="grid min-w-0 gap-3">{children}</div>
    </div>
  );
}

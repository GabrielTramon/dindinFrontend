"use client";

import { CircleCheck } from "lucide-react";
import { IconeCategoria } from "@/components/categorias/icone-categoria";
import { CountUp } from "@/components/motion/count-up";
import type { CartaoMeta } from "@/domain";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BarraProgresso } from "./barra-progresso";

/*
  "Sua meta": a meta à vista, logo abaixo do cartão do topo, em qualquer passo
  do plano. O topo fala do passo de agora (fôlego, dívida, reserva); aqui fica
  o que a pessoa quer: quanto já tem, a barra até o alvo, quando chega e como.

  As frases vêm prontas de `cartaoDaMeta` (domínio): aqui só se desenha.
*/

export function MetaCard({ cartao }: { cartao: CartaoMeta }) {
  const garantida = cartao.estado === "garantida";
  return (
    <section aria-labelledby="meta-card-titulo" className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-6">
      <p className="sr-only">{cartao.rotuloSr}</p>
      <div aria-hidden="true">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary">
            <IconeCategoria icone={cartao.icone} className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">Sua meta</p>
            <h2 id="meta-card-titulo" className="truncate text-lg font-extrabold tracking-tight">
              {cartao.nome}
            </h2>
          </div>
          <p className="ml-auto shrink-0 text-2xl font-extrabold text-primary tnum">{cartao.pct}%</p>
        </div>

        <p className="mt-4 flex flex-wrap items-baseline gap-x-1.5 tnum">
          <span className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            <CountUp value={cartao.jaTem} />
          </span>
          <span className="font-bold text-ink-2">de {formatBRL(cartao.valorAlvo)}</span>
        </p>
        <BarraProgresso
          atual={cartao.jaTem}
          alvo={cartao.valorAlvo}
          rotulo={`${cartao.nome}: ${formatBRL(cartao.jaTem)} de ${formatBRL(cartao.valorAlvo)}`}
          className="mt-2 h-3"
        />

        <p
          className={cn(
            "mt-4 inline-flex flex-wrap items-center gap-x-1.5 text-lg font-bold",
            garantida && "text-primary",
            cartao.estado === "sem-prazo" && "text-warn",
          )}
        >
          {garantida && <CircleCheck className="size-5 shrink-0" />}
          {cartao.titulo}
          {cartao.mes && <span className="font-normal text-ink-2">· {cartao.mes}</span>}
        </p>
        <p className="mt-1 text-sm text-pretty text-ink-2 tnum">{cartao.como}</p>
      </div>
    </section>
  );
}

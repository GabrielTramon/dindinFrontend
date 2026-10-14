"use client";

import { useState, type PointerEvent } from "react";
import { Marcador } from "@/components/ui/segment-bar";
import type { MesDeJuros } from "@/domain";
import { marcasDoEixo } from "@/lib/eixo";
import { formatBRL, formatBRLCurto } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
  O dinheiro crescendo, coluna por coluna: o investido embaixo (cinza, a base)
  e os juros em cima (esmeralda, o que a página quer mostrar) — o "juros sobre
  juros" fica à vista na curva da parte verde.

  Desenho (skill de dataviz): forma de destaque (um tom + cinza, cores
  validadas nos dois temas: tokens chart-1 e chart-base), colunas de no máximo
  24px com ponta arredondada de 4px e base reta, 2px de respiro entre as duas
  partes, grade em linha fina, eixo com números redondos (marcasDoEixo) e a
  legenda sempre visível. Passar o mouse (ou tocar) numa coluna mostra o
  valor dela; o resto apaga um pouco.

  O gráfico é o resumo visual: quem lê a tela com leitor ouve o resumo
  (role="img") e tem a tabela embaixo, com todos os números.
*/

const PASSOS_DO_EIXO = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 25, 50, 100] as const;

interface GraficoCrescimentoProps {
  /** uma coluna por linha, na ordem do tempo (sem o mês 0) */
  linhas: MesDeJuros[];
  /** "Ano 3", "Mês 5" — o título do valor em destaque */
  rotulo: (linha: MesDeJuros) => string;
  /** o número embaixo da coluna: "3", "5" */
  rotuloDoEixo: (linha: MesDeJuros) => string;
  /** a unidade do eixo de baixo: "anos" ou "meses" */
  unidade: string;
  /** a frase que o leitor de tela lê no lugar do gráfico */
  resumo: string;
}

export function GraficoCrescimento({ linhas, rotulo, rotuloDoEixo, unidade, resumo }: GraficoCrescimentoProps) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const maximo = Math.max(0, ...linhas.map((l) => l.total));
  const marcas = marcasDoEixo(maximo);
  const topo = marcas[marcas.length - 1] || 1;
  // uns 6 números no eixo de baixo, em passos redondos: 50 anos → a cada 10; 24 meses → a cada 4
  const passoDoEixo = PASSOS_DO_EIXO.find((p) => p >= linhas.length / 6) ?? Math.ceil(linhas.length / 6);
  const destaque = ativo === null ? null : linhas[ativo];
  const n = linhas.length;

  // no mouse, sair da área apaga o destaque; no toque, ele fica até o próximo toque
  function sair(evento: PointerEvent<HTMLDivElement>) {
    if (evento.pointerType === "mouse") setAtivo(null);
  }

  if (n === 0) return null;

  return (
    <figure className="min-w-0">
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <Marcador className="bg-chart-base" />
          Investido
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Marcador className="bg-chart-1" />
          Juros
        </span>
      </figcaption>

      {/* pt-3: o número do topo do eixo fica meio acima da área (está centrado na linha) */}
      <div role="img" aria-label={resumo} className="mt-4 grid grid-cols-[4rem_minmax(0,1fr)] gap-x-3 pt-3">
        {/* eixo da esquerda: os valores das linhas de grade */}
        <div aria-hidden="true" className="relative h-56 sm:h-64">
          {marcas.map((m) => (
            <span
              key={m}
              className="absolute right-0 translate-y-1/2 text-xs whitespace-nowrap text-muted-foreground tnum"
              style={{ bottom: `${(m / topo) * 100}%` }}
            >
              {formatBRLCurto(m)}
            </span>
          ))}
        </div>

        {/* a área: grade + colunas + o valor em destaque */}
        <div aria-hidden="true" className="relative h-56 sm:h-64" onPointerLeave={sair}>
          {marcas.map((m) => (
            <span
              key={m}
              className={cn("absolute inset-x-0 h-px", m === 0 ? "bg-border-strong" : "bg-border/70")}
              style={{ bottom: `${(m / topo) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end gap-0.5">
            {linhas.map((l, i) => (
              <div
                key={l.mes}
                // a coluna inteira (até o topo) é o alvo do ponteiro, não só a parte pintada
                className="flex h-full min-w-0 flex-1 cursor-default items-end justify-center"
                onPointerEnter={() => setAtivo(i)}
                onPointerDown={() => setAtivo(i)}
              >
                <div
                  className={cn(
                    "flex w-full max-w-6 flex-col justify-end gap-0.5 transition-[height,opacity] duration-(--duration-slow) ease-out-expo motion-reduce:transition-none",
                    ativo !== null && ativo !== i && "opacity-45",
                  )}
                  style={{ height: `${(l.total / topo) * 100}%` }}
                >
                  {l.juros > 0 && <span className="min-h-0 basis-0 rounded-t-[4px] bg-chart-1" style={{ flexGrow: l.juros }} />}
                  {l.investido > 0 && (
                    <span
                      className={cn("min-h-0 basis-0 bg-chart-base", l.juros <= 0 && "rounded-t-[4px]")}
                      style={{ flexGrow: l.investido }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {destaque && ativo !== null && (
            <div
              className="pointer-events-none absolute top-0 z-10 min-w-40 rounded-xl border bg-card px-3 py-2 text-sm shadow-card"
              style={{
                left: `${((ativo + 0.5) / n) * 100}%`,
                // nas pontas, o quadro encosta pro lado de dentro em vez de sair da área
                transform: ativo < n * 0.25 ? "translateX(-12%)" : ativo > n * 0.75 ? "translateX(-88%)" : "translateX(-50%)",
              }}
            >
              <p className="text-xs text-muted-foreground">{rotulo(destaque)}</p>
              <p className="font-extrabold text-foreground tnum">{formatBRL(destaque.total)}</p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-2 tnum">
                <span className="inline-block h-0.5 w-3 rounded-full bg-chart-base" />
                {formatBRL(destaque.investido)} investidos
              </p>
              <p className="flex items-center gap-1.5 text-xs text-ink-2 tnum">
                <span className="inline-block h-0.5 w-3 rounded-full bg-chart-1" />
                {formatBRL(destaque.juros)} de juros
              </p>
            </div>
          )}
        </div>

        {/* eixo de baixo: o tempo */}
        <span aria-hidden="true" className="pt-2 text-right text-xs text-muted-foreground">
          {unidade}
        </span>
        <div aria-hidden="true" className="flex gap-0.5 pt-2">
          {linhas.map((l, i) => (
            <span
              key={l.mes}
              // com colunas finas (mais de 12), o último número encosta pra dentro em vez de passar da borda
              className={cn(
                "min-w-0 flex-1 text-xs whitespace-nowrap text-muted-foreground tnum",
                i === n - 1 && n > 12 ? "text-right" : "text-center",
              )}
            >
              {(i + 1) % passoDoEixo === 0 || i === n - 1 ? rotuloDoEixo(l) : ""}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

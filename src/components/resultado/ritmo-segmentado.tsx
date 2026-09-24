"use client";

import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { m } from "motion/react";
import { useId } from "react";
import { SPRING_SNAPPY } from "@/components/motion/springs";
import type { RespostaPlano, Ritmo } from "@/domain";
import { cn } from "@/lib/utils";

/*
  O ritmo como controle segmentado de 3, colado no número que ele muda: tocar
  e ver o número contar é a explicação do ritmo. Cada segmento tem o nome e a %
  do que sobra (de `simularRitmos`, sempre sem a escolha manual).

  A seleção é uma pílula que desliza de um segmento pro outro (m.span com
  layoutId, mola SNAPPY; em reduced-motion o MotionProvider só troca). Quando a
  pessoa escolheu a % à mão, nenhum segmento fica marcado e uma linha explica.
*/

interface RitmoSegmentadoProps {
  resposta: RespostaPlano;
  onEscolher: (ritmo: Ritmo) => void;
  className?: string;
}

export function RitmoSegmentado({ resposta, onEscolher, className }: RitmoSegmentadoProps) {
  const id = useId();
  const rotuloId = `${id}-rotulo`;

  return (
    <div className={cn("min-w-0", className)}>
      <p id={rotuloId} className="eyebrow">
        Ritmo <span className="font-bold normal-case tracking-normal">· quanto do que sobra você separa</span>
      </p>

      <RadioGroup<Ritmo | null>
        aria-labelledby={rotuloId}
        value={resposta.ritmoMarcado}
        onValueChange={(valor) => {
          if (valor) onEscolher(valor);
        }}
        className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-background/70 p-1"
      >
        {resposta.segmentos.map((s) => {
          const marcado = resposta.ritmoMarcado === s.ritmo;
          const descricaoId = `${id}-${s.ritmo}`;
          return (
            <Radio.Root
              key={s.ritmo}
              value={s.ritmo}
              aria-describedby={descricaoId}
              className={cn(
                "relative isolate flex h-14 min-w-0 cursor-pointer flex-col items-center justify-center rounded-xl leading-tight outline-none select-none",
                "text-ink-2 transition-colors duration-(--duration-base) hover:text-foreground",
                "focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-accent",
                marcado && "text-foreground",
              )}
            >
              {marcado && (
                <m.span
                  layoutId="ritmo-pilula"
                  aria-hidden="true"
                  transition={SPRING_SNAPPY}
                  className="absolute inset-0 -z-10 rounded-xl bg-card shadow-card ring-1 ring-border/60 dark:bg-primary/15 dark:ring-primary/30"
                />
              )}
              <span className="truncate text-sm font-bold">{s.nome}</span>
              <span className={cn("text-base font-extrabold tnum", marcado && "text-primary")}>{s.pct}%</span>
              <span id={descricaoId} className="sr-only">
                {s.descricaoSr}
              </span>
            </Radio.Root>
          );
        })}
      </RadioGroup>

      {resposta.linhaRitmo && <p className="mt-2 text-sm text-ink-2">{resposta.linhaRitmo}</p>}

      {/* a troca de ritmo (ou de %) muda os números: quem usa leitor de tela ouve o novo */}
      <p aria-live="polite" className="sr-only">
        {resposta.anuncio}
      </p>
    </div>
  );
}

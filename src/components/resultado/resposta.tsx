"use client";

import { CircleCheck, Flag, TrendingUp } from "lucide-react";
import { ctaClasses } from "@/components/layout/cta-link";
import { CountUp } from "@/components/motion/count-up";
import type { AlvoResposta, EtapasResposta, RespostaCorte, RespostaPlano, Ritmo, TempoResposta } from "@/domain";
import { formatBRL, formatMeses } from "@/lib/format";
import { cn } from "@/lib/utils";
import { abrirDetalhes } from "./detalhes-plano";
import { ListaNumerada } from "./lista-numerada";
import { RitmoSegmentado } from "./ritmo-segmentado";

/*
  A resposta: a única superfície da tela. Um cartão só (bg-accent + malha
  sutil), com o objetivo em palavras e o valor total a alcançar (a pílula
  "Meta R$ 40.000"), UM número gigante (quanto por mês), a % do que sobra, o
  tempo e o ritmo. O resto da página é tipografia sobre o fundo.

  As frases vêm prontas de `respostaDoPlano` (domínio): aqui só se desenha.
  Os números contam do valor anterior pro novo ao trocar ritmo ou % (CountUp
  guarda o último valor por instância; parado em reduced-motion).
*/

/** estável (nível de módulo): o CountUp tem `format` nas dependências */
const formatarMeses = (n: number) => formatMeses(n);

const LINK =
  "inline-flex min-h-11 items-center rounded-md text-sm font-bold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-accent";

interface RespostaProps {
  resposta: RespostaPlano;
  onEscolherRitmo: (ritmo: Ritmo) => void;
  /** false quando o cartão "Sua meta" logo abaixo já mostra o valor da meta (degrau 4) */
  mostrarAlvo?: boolean;
}

export function Resposta({ resposta, onEscolherRitmo, mostrarAlvo = true }: RespostaProps) {
  const acao = resposta.acaoSugerida;
  return (
    <section aria-labelledby="resposta-objetivo" className="mesh-panel rounded-3xl bg-accent p-5 sm:p-8">
      <p className="eyebrow">{resposta.eyebrow}</p>

      <div className="mt-1 flex items-baseline justify-between gap-3">
        <h1 id="resposta-objetivo" className="min-w-0 text-xl font-extrabold tracking-tight sm:text-2xl">
          {resposta.objetivo}
        </h1>
        <button type="button" className={cn(LINK, "shrink-0")} onClick={() => abrirDetalhes("porque")}>
          Por quê?
        </button>
      </div>

      {mostrarAlvo && resposta.alvo && <Alvo alvo={resposta.alvo} />}

      <dl className="mt-4">
        <div>
          <dt className="sr-only">Por mês</dt>
          <dd className="flex items-baseline gap-1.5">
            <span className="number-glow text-5xl font-extrabold tracking-tight text-primary tnum sm:text-6xl">
              <CountUp value={resposta.valorMes} />
            </span>
            <span className="text-lg font-bold text-ink-2">/mês</span>
          </dd>
          <dd className="mt-1 text-sm font-bold text-ink-2 tnum">{resposta.pctTexto}</dd>
        </div>
        <div className="mt-4">
          <dt className="sr-only">Por quanto tempo</dt>
          {resposta.etapas ? <Etapas tempo={resposta.tempo} etapas={resposta.etapas} /> : <Tempo tempo={resposta.tempo} />}
          {resposta.rendimentoAdianta !== undefined && (
            <dd className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-primary">
              <TrendingUp aria-hidden="true" className="size-4 shrink-0" />
              Com o rendimento, chega {formatMeses(resposta.rendimentoAdianta)} antes
            </dd>
          )}
          {resposta.depois && <dd className="mt-1 text-sm text-ink-2">{resposta.depois}</dd>}
          {resposta.decimo && <dd className="mt-1 text-sm text-ink-2">{resposta.decimo}</dd>}
        </div>
      </dl>

      {resposta.tempo.tipo === "sem-prazo" || resposta.tempo.tipo === "parado" || resposta.tempo.tipo === "pronta" ? (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-ink-2">{resposta.tempo.frase}</p>
          {acao && (
            <button type="button" className={ctaClasses("secondary")} onClick={() => onEscolherRitmo(acao.ritmo)}>
              {acao.rotulo}
            </button>
          )}
          {resposta.tempo.tipo === "sem-prazo" && resposta.tempo.verDetalhes && (
            <button type="button" className={LINK} onClick={() => abrirDetalhes("dividas")}>
              {resposta.tempo.verDetalhes.rotulo}
            </button>
          )}
        </div>
      ) : null}

      <p className="mt-3 text-sm text-ink-2">{resposta.fecho}</p>

      <RitmoSegmentado className="mt-6" resposta={resposta} onEscolher={onEscolherRitmo} />
    </section>
  );
}

/**
 * "Meta R$ 40.000" — até onde o plano de agora vai. Pílula clara sobre o
 * cartão; o "faltam R$ X" fica do lado, fora dela, e desce inteiro quando
 * não cabe (dentro da pílula ele quebrava com um "·" solto no começo).
 */
function Alvo({ alvo }: { alvo: AlvoResposta }) {
  return (
    <div className="mt-3">
      <p className="sr-only">{alvo.rotuloSr}</p>
      <div aria-hidden="true" className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="inline-flex h-9 items-center gap-2 rounded-full bg-card/70 px-3.5 text-sm whitespace-nowrap ring-1 ring-border/70 dark:bg-card/40">
          <Flag className="size-4 shrink-0 text-primary" />
          <span className="font-bold text-ink-2">{alvo.rotulo}</span>
          <span className="font-extrabold text-foreground tnum">{formatBRL(alvo.valor)}</span>
        </span>
        {alvo.detalhe && <span className="text-sm font-bold text-ink-2 tnum">{alvo.detalhe}</span>}
      </div>
    </div>
  );
}

/** o marcador de cada linha das etapas: cheio no passo de agora, vazado na meta (o mesmo desenho do caminho) */
const MARCADOR = "mt-[0.55em] size-2.5 shrink-0 rounded-full";

/*
  Antes da meta, o tempo tem duas linhas, e cada prazo diz do que é: "Fôlego
  pronto em 1 mês" e "Liberdade financeira em 4 meses". Um "por 1 mês" sozinho
  era lido como o prazo da meta. Os dois contam a partir de agora, como o caminho.
*/
function Etapas({ tempo, etapas }: { tempo: TempoResposta; etapas: EtapasResposta }) {
  const { meta } = etapas;
  return (
    <>
      {tempo.tipo === "prazo" ? (
        <dd className="flex items-start gap-2.5 text-lg font-bold">
          <span aria-hidden="true" className={cn(MARCADOR, "bg-primary")} />
          <span className="min-w-0">
            <span className="sr-only">{tempo.rotuloSr}</span>
            <span aria-hidden="true">
              {etapas.passo} em <CountUp value={tempo.meses} format={formatarMeses} className="tnum" />
              <span className="block text-base font-normal text-ink-2">até {tempo.mes}</span>
            </span>
          </span>
        </dd>
      ) : (
        <Tempo tempo={tempo} />
      )}
      <dd className="mt-2 flex items-start gap-2.5 text-lg font-bold">
        <span aria-hidden="true" className={cn(MARCADOR, "border-2 border-primary")} />
        <span className="min-w-0">
          <span className="sr-only">{meta.rotuloSr}</span>
          <span aria-hidden="true">
            {meta.meses !== null && meta.meses > 0 && meta.mes !== null ? (
              <>
                {meta.nome} em <span className="tnum">{formatMeses(meta.meses)}</span>
                <span className="block text-base font-normal text-ink-2">até {meta.mes}</span>
              </>
            ) : (
              <>
                {meta.nome} <span className="font-normal text-ink-2">{meta.texto}</span>
              </>
            )}
          </span>
        </span>
      </dd>
    </>
  );
}

function Tempo({ tempo }: { tempo: TempoResposta }) {
  switch (tempo.tipo) {
    case "prazo":
      return (
        <dd className="text-lg font-bold">
          <span className="sr-only">{tempo.rotuloSr}</span>
          <span aria-hidden="true">
            por <CountUp value={tempo.meses} format={formatarMeses} className="tnum" />
            <span className="font-normal text-ink-2"> · até {tempo.mes}</span>
          </span>
        </dd>
      );
    case "ano":
      return (
        <dd className="text-lg font-bold">
          <span className="sr-only">{tempo.rotuloSr}</span>
          <span aria-hidden="true" className="tnum">
            {tempo.texto}
          </span>
        </dd>
      );
    case "pronta":
      return (
        <dd className="inline-flex items-center gap-1.5 text-lg font-bold text-primary">
          <span className="sr-only">{tempo.rotuloSr}</span>
          <CircleCheck aria-hidden="true" className="size-5 shrink-0" />
          <span aria-hidden="true">{tempo.texto}</span>
        </dd>
      );
    case "sem-prazo":
    case "parado":
      return (
        <dd className="text-lg font-bold text-warn">
          <span className="sr-only">{tempo.rotuloSr}</span>
          <span aria-hidden="true">{tempo.texto}</span>
        </dd>
      );
  }
}

/*
  Modo corte: a conta não fecha, então o cartão vira warn e a resposta é quanto
  cortar. Sem ritmo, sem caminho, sem divisor. Embaixo, "Por onde começar" com
  as duas primeiras ideias; as outras ficam nos detalhes.
*/
export function RespostaDeCorte({ resposta }: { resposta: RespostaCorte }) {
  return (
    <div className="space-y-10">
      <section
        aria-labelledby="resposta-objetivo"
        className="mesh-panel rounded-3xl bg-warn-soft p-5 [--mesh-1:transparent] [--mesh-2:transparent] sm:p-8"
      >
        <p className="eyebrow text-warn">{resposta.eyebrow}</p>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h1 id="resposta-objetivo" className="min-w-0 text-xl font-extrabold tracking-tight sm:text-2xl">
            {resposta.objetivo}
          </h1>
          <button
            type="button"
            className={cn(LINK, "shrink-0 focus-visible:ring-offset-warn-soft")}
            onClick={() => abrirDetalhes("porque")}
          >
            Por quê?
          </button>
        </div>

        <dl className="mt-4">
          <div>
            <dt className="sr-only">Por mês</dt>
            <dd className="flex items-baseline gap-1.5">
              <span className="number-glow text-5xl font-extrabold tracking-tight text-warn tnum sm:text-6xl">
                <CountUp value={resposta.valorMes} />
              </span>
              <span className="text-lg font-bold text-ink-2">/mês</span>
            </dd>
            <dd className="mt-1 text-sm font-bold text-ink-2">{resposta.linhaValor}</dd>
          </div>
          <div className="mt-4">
            <dt className="sr-only">Hoje</dt>
            <dd className="text-lg font-bold tnum">{resposta.linhaFalta}</dd>
          </div>
        </dl>

        <p className="mt-3 text-sm text-ink-2">{resposta.frase}</p>
      </section>

      {resposta.porOndeComecar.sugestoes.length > 0 && (
        <section aria-labelledby="por-onde-comecar">
          <h2 id="por-onde-comecar" className="eyebrow mb-4">
            {resposta.porOndeComecar.titulo}
          </h2>
          <ListaNumerada itens={resposta.porOndeComecar.sugestoes} />
        </section>
      )}
    </div>
  );
}

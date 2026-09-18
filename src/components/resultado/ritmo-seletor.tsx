"use client";

import { useMemo } from "react";
import {
  gerarPlano,
  MARGEM_MINIMA_CORTE,
  MESES_SIMULACAO_MAX,
  NOME_DIVIDA,
  RITMOS,
  RITMO_PADRAO,
  type DividaAvaliada,
  type OpcoesMotor,
  type Perfil,
  type Plano,
  type Ritmo,
} from "@/domain";
import { formatBRL, formatMeses, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
  Os três ritmos, lado a lado. A escolha só vale a pena se a pessoa vir o que
  ela muda, então cada cartão traz o número do mês (quanto guarda, quanto
  sobra) e o prazo que mais importa no degrau em que ela está — o do cartão que
  está comendo juros, ou o da reserva.

  Os números não são recalculados aqui: cada cartão roda o próprio `gerarPlano`
  com o mesmo perfil e um ritmo diferente. É a mesma conta que a página mostra,
  então o cartão nunca promete um número que o plano não entrega.
*/

const ROTULO: Record<Ritmo, string> = {
  leve: "Leve",
  equilibrado: "Equilibrado",
  acelerado: "Acelerado",
};

/** uma linha só, pra quem nunca guardou dinheiro entender a diferença antes de ler o número */
const RESUMO: Record<Ritmo, string> = {
  leve: "Passo curto, mês mais folgado",
  equilibrado: "Guarda bem sem apertar o mês",
  acelerado: "Passo maior, mês mais justo",
};

interface RitmoSeletorProps {
  /** o perfil que gerou o plano da página */
  perfil: Perfil;
  /** o ritmo em vigor — quem chama é dono do estado */
  ritmo: Ritmo;
  onChange: (ritmo: Ritmo) => void;
  /**
   * repassado a `gerarPlano`. Existe pra os três cartões usarem a mesma régua
   * da página: se ela um dia passar outra taxa livre de risco, os cartões
   * classificariam as dívidas de um jeito e o plano de outro.
   */
  opcoes?: OpcoesMotor;
  /**
   * true quando a pessoa editou o "Guardar" na mão: nenhum dos três cartões
   * descreve o plano dela, e marcar um deles seria mostrar um número que não é
   * o do plano lá em cima.
   */
  personalizado?: boolean;
  className?: string;
}

export function RitmoSeletor({ perfil, ritmo, onChange, opcoes, personalizado, className }: RitmoSeletorProps) {
  const planos = useMemo(
    () => RITMOS.map((r) => ({ ritmo: r, plano: gerarPlano({ ...perfil, ritmo: r }, opcoes) })),
    [perfil, opcoes],
  );

  // Em modo corte o aporte é 0 por desenho: escolher ritmo aqui seria oferecer
  // uma decisão que não existe. `modoCorte` não depende do ritmo (é excedente ≤ 0).
  if (planos[0].plano.modoCorte) return null;

  const atual = planos.find((p) => p.ritmo === ritmo) ?? planos[0];

  return (
    <section aria-labelledby="ritmo-titulo" className={cn("min-w-0", className)}>
      <h2 id="ritmo-titulo" className="text-lg font-extrabold tracking-tight sm:text-xl">
        Em que ritmo você quer seguir
      </h2>
      <p id="ritmo-ajuda" className="mt-2 text-ink-2">
        Depois das contas do mês sobra um dinheiro. O ritmo decide quanto dele você guarda e quanto
        fica livre pra viver o mês. Guardar mais encurta os prazos; guardar menos deixa o mês mais
        leve. Nenhum é errado, e dá pra mudar quando quiser.
      </p>

      <fieldset aria-describedby="ritmo-ajuda" className="mt-4 grid min-w-0 gap-3 sm:grid-cols-3">
        <legend className="sr-only">Escolha o ritmo do seu plano</legend>
        {planos.map(({ ritmo: r, plano }) => (
          <CartaoRitmo
            key={r}
            ritmo={r}
            plano={plano}
            selecionado={!personalizado && r === ritmo}
            onSelect={() => onChange(r)}
          />
        ))}
      </fieldset>

      {personalizado && (
        <p className="mt-3 text-sm text-ink-2">
          Você ajustou quanto guardar direto no grupo <strong className="font-bold">Guardar</strong>,
          ali embaixo. Toque num ritmo pra voltar ao sugerido.
        </p>
      )}

      {/* os números dos cartões mudam junto com a escolha; quem usa leitor de tela ouve o novo */}
      <p aria-live="polite" className="sr-only">
        {personalizado
          ? "Você ajustou quanto guardar na mão; nenhum dos três ritmos está selecionado."
          : `Ritmo ${ROTULO[atual.ritmo].toLowerCase()}: guarda ${formatBRL(atual.plano.aporte)} por mês e sobram ${formatBRL(atual.plano.livre)}.`}
      </p>
    </section>
  );
}

interface CartaoRitmoProps {
  ritmo: Ritmo;
  plano: Plano;
  selecionado: boolean;
  onSelect: () => void;
}

function CartaoRitmo({ ritmo, plano, selecionado, onSelect }: CartaoRitmoProps) {
  const id = `ritmo-${ritmo}`;

  return (
    <div className="min-w-0">
      <input
        type="radio"
        id={id}
        name="ritmo"
        value={ritmo}
        checked={selecionado}
        onChange={onSelect}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        className="flex h-full min-h-14 min-w-0 cursor-pointer flex-col gap-2 rounded-2xl border border-border bg-card px-4 py-4 transition-colors select-none hover:border-ink-3 peer-checked:border-primary peer-checked:bg-accent peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 motion-reduce:transition-none"
      >
        <span className="flex min-w-0 items-center justify-between gap-2">
          <span className="min-w-0 font-bold leading-snug text-foreground">{ROTULO[ritmo]}</span>
          {ritmo === RITMO_PADRAO && (
            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
              sugerido
            </span>
          )}
        </span>

        <span className="text-sm text-ink-2">{RESUMO[ritmo]}</span>

        <span className="text-sm leading-snug tnum">
          <strong className="font-extrabold text-foreground">
            Guarda {formatBRL(plano.aporte)}
          </strong>
          <span className="text-ink-2"> · sobram {formatBRL(plano.livre)} pro mês</span>
        </span>

        {/* decorativa: os dois valores já estão escritos na linha de cima */}
        <span
          aria-hidden="true"
          className="flex h-1.5 min-w-0 overflow-hidden rounded-full bg-muted"
        >
          <span className="min-w-0 basis-0 bg-primary" style={{ flexGrow: plano.aporte }} />
          <span className="min-w-0 basis-0 bg-chart-3" style={{ flexGrow: plano.livre }} />
        </span>

        <span className="mt-auto border-t border-border pt-2 text-sm text-ink-2">
          {diferenca(plano)}
        </span>

        {plano.piso.mordeu && <span className="text-xs text-ink-2">{textoDoPiso(plano)}</span>}
      </label>
    </div>
  );
}

/** "o rotativo do cartão" quando é uma só; o plural genérico quando são várias */
function nomeDas(lista: DividaAvaliada[], plural: string): string {
  return lista.length === 1 ? NOME_DIVIDA[lista[0].tipo] : plural;
}

/**
 * A linha que faz a escolha valer: o prazo que muda de ritmo pra ritmo, no
 * degrau em que a pessoa está. Sem dívida cara, o prazo é o da reserva; com
 * tudo em dia, o que o ano inteiro acumula.
 *
 * Quando o prazo não existe naquele ritmo, o texto diz isso com todas as
 * letras e sem drama — o cartão do lado já mostra o ritmo que resolve.
 */
function diferenca(plano: Plano): string {
  const { dividas, reserva, aporte } = plano;

  if (dividas.caras.length > 0) {
    const meses = dividas.mesesParaQuitarCaras;
    if (meses !== null) {
      return `Zera ${nomeDas(dividas.caras, "as dívidas caras")} em ${formatMeses(meses)}`;
    }
    if (plano.diagnosticoCaras?.motivo === "horizonte") {
      return `Neste ritmo a dívida levaria mais de ${MESES_SIMULACAO_MAX / 12} anos pra zerar`;
    }
    return "Neste ritmo os juros crescem mais rápido do que o que sobra pra pagar";
  }

  if (!reserva.ok) {
    const meses = reserva.mesesParaCompletar;
    if (meses === null) return "A reserva entra depois das prioridades de cima";
    return `Reserva completa em ${formatMeses(meses)}`;
  }

  if (dividas.medias.length > 0) {
    const meses = dividas.mesesParaQuitarMedias;
    const nome = nomeDas(dividas.medias, "as dívidas que faltam");
    if (meses !== null) return `Antecipa ${nome} em ${formatMeses(meses)}`;
    return "Neste ritmo a dívida segue no prazo original do contrato";
  }

  // reserva feita e sem dívida: o que muda é o tamanho do bolo no fim do ano
  return `Em 1 ano, ${formatBRL(aporte * 12)} guardados pras suas metas`;
}

/**
 * Só aparece no acelerado, e só quando o motor segurou o aporte: sem esta
 * linha o cartão mostraria um número menor do que a tabela do ritmo pede, sem
 * explicação nenhuma.
 */
function textoDoPiso(plano: Plano): string {
  return `Neste ritmo o máximo aqui é ${formatBRL(plano.piso.teto)}: acima disso sobraria menos de ${formatPct(MARGEM_MINIMA_CORTE)} da renda pro mês, e aí o plano não se sustenta.`;
}

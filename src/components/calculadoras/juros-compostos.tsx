"use client";

import { RotateCcw } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { ctaClasses } from "@/components/layout/cta-link";
import { CountUp } from "@/components/motion/count-up";
import { MoneyInput } from "@/components/onboarding/money-input";
import { NumberInput } from "@/components/onboarding/number-input";
import { Marcador, SegmentBar } from "@/components/ui/segment-bar";
import { Segmented } from "@/components/ui/segmented";
import { TextField } from "@/components/ui/text-field";
import { jurosCompostos, MAX_MESES_JUROS, porAno, taxaAoMes, type MesDeJuros, type PeriodoTaxa } from "@/domain";
import { formatBRL, formatMeses, formatPct, mascaraTaxa, taxaDoTexto } from "@/lib/format";
import { cn } from "@/lib/utils";
import { GraficoCrescimento } from "./grafico-crescimento";

/*
  A calculadora de juros compostos: valor inicial, valor mensal, taxa (ao mês
  ou ao ano) e o tempo (em meses ou anos). Mostra o valor final, o investido e
  o total em juros, o gráfico do crescimento e a tabela do total sobre o
  investido — ano a ano ou mês a mês.

  Nada é salvo: é a conta na hora, e sai da tela quando ela sai. Nenhum campo
  vem preenchido com taxa: o app não sugere quanto um investimento rende.

  A conta é a de juros-compostos.ts (a mesma do "E se você mantiver?" do
  plano): depósito no fim de cada mês, e a taxa ao ano vira a mensal
  EQUIVALENTE (12% a.a. ≈ 0,95% a.m.), não a divisão por 12.

  Os campos ficam em duas colunas (a partir de 640px), com o resultado logo
  embaixo. A taxa e o período têm a unidade num controle segmentado colado no
  número, os dois com a mesma largura e a mesma ordem (mês, depois ano), e uma
  linha de ajuda cada ("Equivale a…").
*/

type Unidade = "anos" | "meses";
type Visao = "ano" | "mes";

// toda escolha de unidade da página vai do menor pro maior: mês, depois ano
const PERIODOS_TAXA: readonly { value: PeriodoTaxa; label: string }[] = [
  { value: "mes", label: "ao mês" },
  { value: "ano", label: "ao ano" },
];
const UNIDADES: readonly { value: Unidade; label: string }[] = [
  { value: "meses", label: "meses" },
  { value: "anos", label: "anos" },
];
const VISOES: readonly { value: Visao; label: string }[] = [
  { value: "mes", label: "Mês a mês" },
  { value: "ano", label: "Ano a ano" },
];

/** o teto da taxa, em %: 20% ao mês, 99% ao ano (a máscara aceita 2 dígitos inteiros) */
const TETO_TAXA: Record<PeriodoTaxa, number> = { mes: 20, ano: 99 };
const MAXIMO: Record<Unidade, number> = { anos: MAX_MESES_JUROS / 12, meses: MAX_MESES_JUROS };
/** até aqui, a tabela abre mês a mês e o gráfico tem uma coluna por mês */
const MESES_MES_A_MES = 24;

const pct = (parte: number, todo: number) => (todo > 0 ? Math.round((parte / todo) * 100) : 0);

export function CalculadoraJurosCompostos() {
  const [inicial, setInicial] = useState<number | undefined>(undefined);
  const [mensal, setMensal] = useState<number | undefined>(undefined);
  const [taxaTexto, setTaxaTexto] = useState("");
  const [periodoTaxa, setPeriodoTaxa] = useState<PeriodoTaxa>("mes");
  const [tempo, setTempo] = useState<number | undefined>(undefined);
  const [unidade, setUnidade] = useState<Unidade>("anos");
  // null = a tabela escolhe pelo tempo (até 2 anos, mês a mês); depois do toque, vale o que ela escolheu
  const [visaoEscolhida, setVisaoEscolhida] = useState<Visao | null>(null);

  const taxa = taxaDoTexto(taxaTexto, TETO_TAXA[periodoTaxa]) ?? 0;
  const taxaMensal = taxaAoMes(taxa, periodoTaxa);
  const meses = tempo === undefined ? 0 : unidade === "anos" ? tempo * 12 : tempo;
  const resultado = useMemo(
    () => jurosCompostos({ inicial, mensal, taxaMensal }, meses),
    [inicial, mensal, taxaMensal, meses],
  );
  const temConta = meses > 0 && resultado.investido > 0;

  const visao: Visao = visaoEscolhida ?? (meses > MESES_MES_A_MES ? "ano" : "mes");
  const linhasDaTabela = visao === "ano" ? porAno(resultado.meses) : resultado.meses.slice(1);
  // o gráfico usa a escala que cabe na largura: uma coluna por mês até 2 anos, depois uma por ano
  const porMes = meses <= MESES_MES_A_MES;
  const colunas = porMes ? resultado.meses.slice(1) : porAno(resultado.meses);

  const equivalente =
    taxa <= 0
      ? null
      : periodoTaxa === "ano"
        ? `Equivale a ${formatPct(taxaMensal, 2)} ao mês`
        : `Equivale a ${formatPct((1 + taxaMensal) ** 12 - 1, 2)} ao ano`;

  // o par da linha da taxa: a conversão do período ou, sem ela, o teto (que o campo aplica sozinho)
  const equivalenteDoTempo =
    tempo && unidade === "anos"
      ? `Equivale a ${tempo * 12} meses`
      : tempo && tempo >= 12
        ? `Equivale a ${formatMeses(tempo)}`
        : `Até ${MAXIMO[unidade]} ${unidade}.`;

  const resumo = temConta
    ? `Em ${formatMeses(meses)}: ${formatBRL(resultado.final)} no total, sendo ${formatBRL(resultado.investido)} investidos e ${formatBRL(resultado.juros)} de juros.`
    : "";

  function trocarPeriodoDaTaxa(novo: PeriodoTaxa) {
    setPeriodoTaxa(novo);
    // o número fica; só não pode passar do teto do período novo
    setTaxaTexto((t) => mascaraTaxa(t, TETO_TAXA[novo]));
  }

  function trocarUnidade(nova: Unidade) {
    setUnidade(nova);
    if (tempo !== undefined) setTempo(Math.min(tempo, MAXIMO[nova]));
  }

  function limpar() {
    setInicial(undefined);
    setMensal(undefined);
    setTaxaTexto("");
    setTempo(undefined);
    setVisaoEscolhida(null);
    // o botão some junto com os números: o foco volta pro primeiro campo, não pro fim da página
    document.getElementById("jc-inicial")?.focus();
  }

  const vazio = inicial === undefined && mensal === undefined && taxaTexto === "" && tempo === undefined;

  return (
    <div className="grid min-w-0 gap-12">
      <div className="grid min-w-0 gap-8">
        {/* os campos, em duas colunas: os valores em cima, a taxa e o período embaixo */}
        <form
          noValidate
          onSubmit={(e) => e.preventDefault()}
          className="grid min-w-0 items-start gap-x-6 gap-y-5 sm:grid-cols-2"
          aria-label="Dados da simulação"
        >
          <MoneyInput id="jc-inicial" label="Valor inicial" size="md" value={inicial} onChange={setInicial} />
          <MoneyInput id="jc-mensal" label="Valor mensal" size="md" value={mensal} onChange={setMensal} />

          <CampoComUnidade
            ajudaId="jc-taxa-equivalente"
            ajuda={equivalente ?? "Vazio = sem juros."}
            campo={
              <TextField
                id="jc-taxa"
                label="Taxa de juros"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={taxaTexto}
                onChange={(e) => setTaxaTexto(mascaraTaxa(e.target.value, TETO_TAXA[periodoTaxa]))}
                suffix="%"
                numeric
                aria-describedby="jc-taxa-equivalente"
                className="@xs:flex-1"
              />
            }
            unidade={
              <Segmented<PeriodoTaxa>
                name="jc-periodo-taxa"
                label="A taxa é"
                options={PERIODOS_TAXA}
                value={periodoTaxa}
                onChange={trocarPeriodoDaTaxa}
                className="@xs:w-44"
              />
            }
          />

          <CampoComUnidade
            ajudaId="jc-tempo-equivalente"
            ajuda={equivalenteDoTempo}
            campo={
              <NumberInput
                id="jc-tempo"
                label="Período"
                size="md"
                value={tempo}
                onChange={setTempo}
                parse={(t) => {
                  const digitos = t.replace(/\D/g, "").slice(0, 3);
                  return digitos === "" ? undefined : Math.min(MAXIMO[unidade], Number(digitos));
                }}
                format={String}
                placeholder="0"
                describedBy="jc-tempo-equivalente"
                className="@xs:flex-1"
              />
            }
            unidade={
              <Segmented<Unidade>
                name="jc-unidade"
                label="Período em"
                options={UNIDADES}
                value={unidade}
                onChange={trocarUnidade}
                className="@xs:w-44"
              />
            }
          />
        </form>

        {/* o resultado, logo embaixo dos campos */}
        <section aria-labelledby="jc-resultado-titulo" className="min-w-0 rounded-3xl border bg-card p-5 shadow-card sm:p-7">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <h2 id="jc-resultado-titulo" className="eyebrow">
              {temConta ? `Valor final em ${formatMeses(meses)}` : "Resultado"}
            </h2>
            {!vazio && (
              // -my-3.5: o botão de 44px ocupa a altura da linha do rótulo (aparecer não empurra o cartão)
              <button
                type="button"
                onClick={limpar}
                aria-label="Limpar os campos"
                className={cn(ctaClasses("ghost"), "-my-3.5 -mr-2 h-11 shrink-0 px-3")}
              >
                <RotateCcw aria-hidden="true" className="size-4" />
                Limpar
              </button>
            )}
          </div>
          {/* os números contam até o valor; quem lê a tela ouve só o resumo */}
          <p className="sr-only" aria-live="polite">
            {resumo}
          </p>

          {temConta ? (
            <div
              aria-hidden="true"
              className="mt-2 grid min-w-0 gap-x-10 gap-y-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
            >
              {/* o número de destaque: algarismos proporcionais (tnum só em coluna) */}
              <p className="text-4xl font-extrabold tracking-tight [overflow-wrap:anywhere] text-foreground sm:text-5xl">
                <CountUp value={resultado.final} />
              </p>
              <dl className="grid grid-cols-2 gap-4 md:gap-x-10">
                <div className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-sm text-ink-2">
                    <Marcador className="bg-chart-base" />
                    Valor investido
                  </dt>
                  <dd className="mt-0.5 text-xl font-bold [overflow-wrap:anywhere] tnum">{formatBRL(resultado.investido)}</dd>
                  <dd className="text-xs text-muted-foreground tnum">{pct(resultado.investido, resultado.final)}% do total</dd>
                </div>
                <div className="min-w-0">
                  <dt className="flex items-center gap-1.5 text-sm text-ink-2">
                    <Marcador className="bg-chart-1" />
                    Total em juros
                  </dt>
                  <dd className="mt-0.5 text-xl font-bold [overflow-wrap:anywhere] tnum">{formatBRL(resultado.juros)}</dd>
                  <dd className="text-xs text-muted-foreground tnum">{pct(resultado.juros, resultado.final)}% do total</dd>
                </div>
              </dl>
              <SegmentBar
                className="md:col-span-2"
                segments={[
                  { value: resultado.investido, className: "bg-chart-base" },
                  { value: resultado.juros, className: "bg-chart-1" },
                ]}
              />
            </div>
          ) : (
            <p className="mt-3 text-base text-pretty text-ink-2">
              Preencha o valor inicial ou o mensal, a taxa e o período: o resultado aparece aqui na hora.
            </p>
          )}
        </section>
      </div>

      {temConta && (
        <section aria-labelledby="jc-evolucao-titulo" className="enter-up grid min-w-0 gap-8">
          <div className="grid gap-1">
            <h2 id="jc-evolucao-titulo" className="text-2xl font-extrabold tracking-tight">
              Como o dinheiro cresce
            </h2>
            <p className="text-sm text-ink-2">
              {porMes ? "Mês a mês" : "Ano a ano"}: a parte verde são os juros, que também rendem juros.
            </p>
          </div>

          <GraficoCrescimento
            linhas={colunas}
            rotulo={(l) => (porMes ? `Mês ${l.mes}` : rotuloDoAno(l))}
            rotuloDoEixo={(l) => String(porMes ? l.mes : Math.ceil(l.mes / 12))}
            unidade={porMes ? "meses" : "anos"}
            resumo={resumo}
          />

          <div className="grid min-w-0 gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 id="jc-tabela-titulo" className="font-bold">
                Valor total sobre o valor investido
              </h3>
              <Segmented<Visao>
                name="jc-visao"
                label="Ver a tabela"
                options={VISOES}
                value={visao}
                onChange={setVisaoEscolhida}
                size="sm"
              />
            </div>
            <TabelaDeJuros linhas={linhasDaTabela} visao={visao} />
          </div>
        </section>
      )}

      <p className="text-xs text-pretty text-muted-foreground">
        Simulação educativa: não considera imposto de renda, taxas nem inflação, e não é recomendação de investimento.
      </p>
    </div>
  );
}

/**
 * Um número com unidade (a taxa, o período): o campo e o controle segmentado na
 * mesma linha, alinhados pela base da caixa, e a linha de ajuda embaixo. Numa
 * coluna estreita (menos de 320px, o caso das duas colunas entre 640 e ~720px),
 * a unidade desce pra baixo do campo, na largura toda.
 */
function CampoComUnidade({
  campo,
  unidade,
  ajuda,
  ajudaId,
}: {
  campo: ReactNode;
  unidade: ReactNode;
  ajuda: string;
  ajudaId: string;
}) {
  return (
    <div className="@container grid min-w-0 gap-2">
      <div className="flex min-w-0 flex-col gap-2 @xs:flex-row @xs:items-end @xs:gap-3">
        {campo}
        {unidade}
      </div>
      <p id={ajudaId} className="min-h-5 text-sm text-ink-2 tnum">
        {ajuda}
      </p>
    </div>
  );
}

/** "Ano 3"; o último, quando o prazo não fecha o ano, vira "2 anos e 6 meses" */
function rotuloDoAno(l: MesDeJuros): string {
  return l.mes % 12 === 0 ? `Ano ${l.mes / 12}` : formatMeses(l.mes);
}

/** Muitas linhas (mês a mês de anos): a tabela rola dentro de uma caixa, com o cabeçalho preso. */
const LINHAS_SEM_ROLAGEM = 24;

function TabelaDeJuros({ linhas, visao }: { linhas: MesDeJuros[]; visao: Visao }) {
  const rola = linhas.length > LINHAS_SEM_ROLAGEM;
  const ultimo = linhas[linhas.length - 1]?.mes;
  return (
    <div
      // com rolagem, a caixa é uma região que o teclado alcança (senão quem não usa mouse não rola)
      {...(rola ? { role: "region", "aria-labelledby": "jc-tabela-titulo", tabIndex: 0 } : {})}
      className={cn(
        "min-w-0 rounded-2xl border",
        rola &&
          "max-h-[28rem] overflow-y-auto outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      )}
    >
      <table className="w-full text-left text-sm tnum">
        <caption className="sr-only">
          Valor total sobre o valor investido, {visao === "ano" ? "ano a ano" : "mês a mês"}
        </caption>
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            <th scope="col" className="px-3 py-2.5 font-bold sm:px-4">
              {visao === "ano" ? "Tempo" : "Mês"}
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-bold sm:px-4">
              Investido
            </th>
            <th scope="col" className="hidden px-3 py-2.5 text-right font-bold sm:table-cell sm:px-4">
              Juros
            </th>
            <th scope="col" className="px-3 py-2.5 text-right font-bold sm:px-4">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.mes} className={cn("border-t align-top", l.mes === ultimo && "bg-accent")}>
              <th scope="row" className="px-3 py-2.5 font-bold whitespace-nowrap sm:px-4">
                {visao === "ano" ? rotuloDoAno(l) : l.mes}
              </th>
              <td className="px-3 py-2.5 text-right text-ink-2 sm:px-4">{formatBRL(l.investido)}</td>
              <td className="hidden px-3 py-2.5 text-right text-ink-2 sm:table-cell sm:px-4">{formatBRL(l.juros)}</td>
              <td className="px-3 py-2.5 text-right font-bold sm:px-4">
                {formatBRL(l.total)}
                {/* no celular a coluna dos juros não cabe: eles vêm embaixo do total */}
                {l.juros >= 1 && (
                  <span className="block text-xs font-normal text-ink-2 sm:hidden">+ {formatBRL(l.juros)} de juros</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

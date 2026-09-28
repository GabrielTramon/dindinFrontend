"use client";

import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { CountUp } from "@/components/motion/count-up";
import { ChipsRadio } from "@/components/onboarding/chips";
import { MoneyInput } from "@/components/onboarding/money-input";
import { NumberInput } from "@/components/onboarding/number-input";
import { TextField } from "@/components/ui/text-field";
import {
  entradasDoDecimo,
  guardarPor,
  MAX_MESES_SIMULADOS,
  PERIODOS_DA_TABELA,
  simularNoTempo,
  textosSimulador,
  type Plano,
} from "@/domain";
import { formatBRL, formatMeses, mascaraTaxa, taxaDoTexto, textoDaTaxa } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MAX_PCT_RENDIMENTO } from "./pote-comum";

/*
  "E se você mantiver?": quanto vira guardar um valor por mês durante um
  tempo — a tabela (6 meses a 20 anos) e um tempo que a pessoa escolhe.

  É um simulador, não o plano: começa com o valor do Guardar e o rendimento
  que a pessoa deu a ele, e o 13º quando ele entra no plano; mexer aqui não
  grava nada. O valor do plano continua mandando enquanto ela não digitar outro
  (trocar de ritmo lá em cima muda aqui também).

  A conta é a do domínio (simulador.ts), com a mesma convenção de mês das
  projeções do plano.
*/

type Unidade = "anos" | "meses";

const UNIDADES: readonly { value: Unidade; label: string }[] = [
  { value: "anos", label: "anos" },
  { value: "meses", label: "meses" },
];

const MAXIMO: Record<Unidade, number> = { anos: MAX_MESES_SIMULADOS / 12, meses: MAX_MESES_SIMULADOS };

interface SimuladorTempoProps {
  plano: Plano;
  /** o que o Guardar separa por mês, em reais inteiros (o número grande do cartão) */
  valorDoPlano: number;
  /** o rendimento que a pessoa deu ao Guardar; ausente = não informou */
  taxaDoGuardar?: number;
}

export function SimuladorTempo({ plano, valorDoPlano, taxaDoGuardar }: SimuladorTempoProps) {
  // null = o valor do plano (segue o ritmo); número ou undefined (campo vazio) = o que ela digitou
  const [valorDigitado, setValorDigitado] = useState<number | undefined | null>(null);
  // null = o rendimento do Guardar; string = o que ela digitou aqui (vazio = sem rendimento)
  const [taxaDigitada, setTaxaDigitada] = useState<string | null>(null);
  const [tempo, setTempo] = useState<number | undefined>(3);
  const [unidade, setUnidade] = useState<Unidade>("anos");
  const [somarDecimo, setSomarDecimo] = useState(true);

  const porMes = valorDigitado === null ? valorDoPlano : (valorDigitado ?? 0);
  const textoTaxa = taxaDigitada ?? textoDaTaxa(taxaDoGuardar);
  const taxaMensal = taxaDoTexto(textoTaxa, MAX_PCT_RENDIMENTO) ?? 0;
  const decimoDoPlano = plano.decimoTerceiro;
  const temDecimo = entradasDoDecimo(decimoDoPlano) !== null;
  const meses = tempo === undefined ? 0 : unidade === "anos" ? tempo * 12 : tempo;

  const tabela = useMemo(
    () =>
      simularNoTempo(
        { porMes, taxaMensal, decimo: somarDecimo ? entradasDoDecimo(decimoDoPlano) : null },
        PERIODOS_DA_TABELA,
      ),
    [porMes, taxaMensal, somarDecimo, decimoDoPlano],
  );
  const escolhido = useMemo(
    () => guardarPor({ porMes, taxaMensal, decimo: somarDecimo ? entradasDoDecimo(decimoDoPlano) : null }, meses),
    [porMes, taxaMensal, somarDecimo, decimoDoPlano, meses],
  );

  const editouValor = valorDigitado !== null && porMes !== valorDoPlano;
  const pagandoDivida = plano.degrau === 1 || plano.degrau === 3;
  const detalhe = textosSimulador.detalhe(escolhido.guardado, escolhido.rendimento);

  function trocarUnidade(nova: Unidade) {
    setUnidade(nova);
    // o número fica; só não pode passar do teto da unidade nova (600 anos não existe)
    if (tempo !== undefined) setTempo(Math.min(tempo, MAXIMO[nova]));
  }

  return (
    <section aria-labelledby="simulador-titulo" className="min-w-0">
      <h2 id="simulador-titulo" className="eyebrow">
        {textosSimulador.titulo}
      </h2>
      <p className="mt-1 text-sm text-ink-2">{textosSimulador.ajuda}</p>

      <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
        <div className="grid min-w-0 gap-1">
          <MoneyInput
            id="simulador-valor"
            label="Guardando por mês"
            size="md"
            value={valorDigitado === null ? valorDoPlano : valorDigitado}
            onChange={(n) => setValorDigitado(n)}
          />
          {editouValor && (
            <button
              type="button"
              onClick={() => setValorDigitado(null)}
              className="inline-flex min-h-11 items-center justify-self-start rounded-md text-sm font-bold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring"
            >
              {textosSimulador.voltarAoPlano(valorDoPlano)}
            </button>
          )}
        </div>
        <TextField
          id="simulador-taxa"
          label="Rende ao mês (opcional)"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={textoTaxa}
          onChange={(e) => setTaxaDigitada(mascaraTaxa(e.target.value, MAX_PCT_RENDIMENTO))}
          suffix="% ao mês"
          className="min-w-0 tnum"
        />
        <div className="grid min-w-0 gap-2 sm:col-span-2">
          <div className="flex min-w-0 flex-wrap items-end gap-3">
            <NumberInput
              id="simulador-tempo"
              label="Por quanto tempo"
              size="md"
              value={tempo}
              onChange={setTempo}
              parse={(t) => {
                const digitos = t.replace(/\D/g, "").slice(0, 3);
                return digitos === "" ? undefined : Math.min(MAXIMO[unidade], Number(digitos));
              }}
              format={String}
              placeholder="3"
              campoClassName="w-28"
            />
            <ChipsRadio<Unidade>
              name="simulador-unidade"
              label="Tempo em"
              options={UNIDADES}
              value={unidade}
              onChange={trocarUnidade}
              className="pb-1.5"
            />
          </div>
        </div>
        {temDecimo && decimoDoPlano && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-bold sm:col-span-2">
            {/* checkbox nativo (teclado e leitor de tela de graça), desenhado com os tokens */}
            <span className="relative flex size-5 shrink-0">
              <input
                type="checkbox"
                checked={somarDecimo}
                onChange={(e) => setSomarDecimo(e.target.checked)}
                className="peer size-5 cursor-pointer appearance-none rounded-md border-2 border-input bg-card outline-none checked:border-primary checked:bg-primary focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              />
              <Check
                aria-hidden="true"
                strokeWidth={3}
                className="pointer-events-none absolute inset-0.5 size-4 text-primary-foreground opacity-0 peer-checked:opacity-100"
              />
            </span>
            {textosSimulador.decimo(decimoDoPlano.valor)}
          </label>
        )}
      </div>

      {/* o número conta até o valor; quem lê a tela ouve só o resultado final */}
      <p className="sr-only" aria-live="polite">
        {meses > 0 ? `${textosSimulador.em(meses)}: ${formatBRL(escolhido.total)}. ${detalhe}.` : ""}
      </p>
      <div aria-hidden="true" className="mt-5 rounded-2xl bg-accent p-4 sm:p-5">
        <p className="eyebrow">{textosSimulador.em(meses)}</p>
        {meses > 0 && (
          <>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-primary tnum">
              <CountUp value={escolhido.total} />
            </p>
            <p className="mt-1 text-sm text-ink-2 tnum">{detalhe}</p>
          </>
        )}
      </div>

      {pagandoDivida && <p className="mt-3 text-sm text-ink-2">{textosSimulador.divida}</p>}
      {taxaMensal === 0 && <p className="mt-3 text-sm text-ink-2">{textosSimulador.semRendimento}</p>}

      <table className="mt-5 w-full text-left text-sm tnum">
        <caption className="sr-only">
          Quanto vira guardar {formatBRL(porMes)} por mês, de 6 meses a 20 anos
        </caption>
        <thead>
          <tr className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            <th scope="col" className="pb-2 font-bold">
              Tempo
            </th>
            {/* sem rendimento, o que você guarda É o total: uma coluna repetida não diz nada */}
            {taxaMensal > 0 && (
              <th scope="col" className="pb-2 text-right font-bold">
                Você guarda
              </th>
            )}
            <th scope="col" className="pb-2 text-right font-bold">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {tabela.map((linha) => {
            const destaque = linha.meses === meses;
            return (
              <tr key={linha.meses} className={cn("border-t align-top", destaque && "bg-accent")}>
                <th scope="row" className={cn("py-3 pr-2 font-bold", destaque && "pl-2")}>
                  {formatMeses(linha.meses)}
                </th>
                {taxaMensal > 0 && <td className="py-3 pr-2 text-right text-ink-2">{formatBRL(linha.guardado)}</td>}
                <td className={cn("py-3 text-right font-bold", destaque && "pr-2")}>
                  {formatBRL(linha.total)}
                  {linha.rendimento >= 1 && (
                    <span className="block text-xs font-normal text-primary">
                      + {formatBRL(linha.rendimento)} de rendimento
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted-foreground">{textosSimulador.inflacao}</p>
    </section>
  );
}

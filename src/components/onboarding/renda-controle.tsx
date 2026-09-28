import { useState, type ReactNode } from "react";
import { TABELAS_FOLHA, type RendaInformada } from "@/domain";
import { CountUp } from "@/components/motion/count-up";
import { formatBRL } from "@/lib/format";
import { BeneficiosEditor } from "./beneficios-editor";
import { ChipsValor } from "./chips";
import { MoneyInput } from "./money-input";
import { NumberInput } from "./number-input";
import type { ControleIds } from "./passo-controle";
import { erroNaLinha, faltaNosBeneficios, problemaDosBeneficios } from "./passos";
import { holeriteDasRespostas, type BeneficioRascunho, type Respostas } from "./respostas";
import { ValueSlider } from "./value-slider";

/*
  A primeira pergunta. Continua sendo o dinheiro (é o que engaja), mas agora a
  pessoa diz O QUE o número é: o que cai na conta ou o salário bruto.

  O segmentado descreve o NÚMERO, não o vínculo — de propósito. `tipoRenda` (a
  pergunta seguinte) responde variabilidade e decide a reserva de emergência: um
  CLT comissionado que escolhesse "varia muito" pra poder informar o bruto
  perderia 3 meses de reserva.

  Bruto vira líquido na hora, e `rendaMensal` é atualizada junto: é ela que o
  motor usa e que o passo valida. O bloco da estimativa assenta ao aparecer e o
  líquido conta até o valor.

  Embaixo, os vales (VR, VA, VT…). O VT de quem informou o bruto mexe no
  líquido (o desconto de até 6%), então mudar os vales refaz a conta do bruto.
  As mensagens dos vales aparecem no bloco deles, não embaixo do salário.
*/

const BRL: Intl.NumberFormatOptions = { style: "currency", currency: "BRL", maximumFractionDigits: 0 };

/** formato do líquido (único valor com centavos na UI); nível de módulo: função inline reiniciaria a contagem a cada render */
const brlCentavos = (n: number) => formatBRL(n, { centavos: true });

const OPCOES: readonly { value: RendaInformada; rotulo: string }[] = [
  { value: "liquida", rotulo: "O que cai na conta" },
  { value: "bruta", rotulo: "Meu salário bruto" },
];

interface RendaControleProps {
  respostas: Respostas;
  onChange: (patch: Partial<Respostas>) => void;
  ids: ControleIds;
  describedBy?: string;
  invalid?: boolean;
  /** a linha de erro do passo, montada por quem chama */
  erro: ReactNode;
  pergunta: string;
}

export function RendaControle({ respostas, onChange, ids, describedBy, invalid, erro, pergunta }: RendaControleProps) {
  const [flash, setFlash] = useState(0);
  const informada: RendaInformada = respostas.rendaInformada ?? "liquida";
  const ehBruto = informada === "bruta";
  // PJ (quem volta aqui depois da pergunta 2) não tem desconto de CLT: o bruto é o que entra na conta
  const pj = respostas.tipoRenda === "pj";
  const holerite = holeriteDasRespostas(respostas);

  /** no modo bruto, rendaMensal acompanha o líquido calculado (a mesma conta de montarPerfil) */
  const mudarBruto = (
    salarioBruto: number | undefined,
    dependentes = respostas.dependentes,
    beneficios = respostas.beneficios,
  ) => {
    const novo = holeriteDasRespostas({ ...respostas, rendaInformada: "bruta", salarioBruto, dependentes, beneficios });
    onChange({
      salarioBruto,
      dependentes,
      beneficios,
      rendaMensal: novo ? novo.liquido : pj ? salarioBruto : undefined,
      competenciaTabela: novo ? TABELAS_FOLHA.competencia : undefined,
    });
  };

  // o VT mexe no líquido de quem informou o bruto; no resto, o vale não muda a renda
  const mudarBeneficios = (beneficios: BeneficioRascunho[]) =>
    ehBruto ? mudarBruto(respostas.salarioBruto, respostas.dependentes, beneficios) : onChange({ beneficios });

  const problemaVale = problemaDosBeneficios(respostas);
  const faltaVale = problemaVale ? undefined : faltaNosBeneficios(respostas);

  const trocarModo = (valor: RendaInformada) => {
    if (valor === informada) return;
    if (valor === "bruta") {
      onChange({ rendaInformada: "bruta", salarioBruto: undefined, rendaMensal: undefined });
    } else {
      // volta pro líquido já mostrado: a pessoa confere com o holerite e corrige. O campo do
      // líquido é de reais inteiros: guardar os centavos faria o plano usar um número e a tela mostrar outro.
      onChange({
        rendaInformada: "liquida",
        rendaMensal: holerite ? Math.round(holerite.liquido) : respostas.rendaMensal,
        salarioBruto: undefined,
        competenciaTabela: undefined,
      });
    }
  };

  const abaixoDoMinimo =
    holerite !== null && respostas.salarioBruto !== undefined && respostas.salarioBruto < TABELAS_FOLHA.salarioMinimo;

  return (
    <div className="grid min-w-0 gap-5">
      <fieldset className="min-w-0">
        <legend className="sr-only">O valor abaixo é o quê?</legend>
        <div className="flex min-w-0 gap-2">
          {OPCOES.map((o) => {
            const id = `renda-informada-${o.value}`;
            return (
              <div key={o.value} className="min-w-0 flex-1">
                <input
                  type="radio"
                  id={id}
                  name="rendaInformada"
                  value={o.value}
                  checked={informada === o.value}
                  onChange={() => trocarModo(o.value)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={id}
                  className="press flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full border border-border bg-card px-3 text-center text-sm leading-tight font-bold select-none hover:border-border-strong peer-checked:border-primary peer-checked:bg-accent peer-checked:shadow-card peer-focus-visible:ring-3 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
                >
                  {o.rotulo}
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-2">
        <MoneyInput
          id={ids.controle}
          label={ehBruto ? "Qual o seu salário bruto?" : pergunta}
          hideLabel
          autoFocus
          centavos={ehBruto}
          value={ehBruto ? respostas.salarioBruto : respostas.rendaMensal}
          onChange={(v) => (ehBruto ? mudarBruto(v) : onChange({ rendaMensal: v }))}
          describedBy={describedBy}
          invalid={invalid}
          flashKey={flash}
        />
        {erro}
      </div>

      {ehBruto && pj ? (
        <p className="enter-up rounded-2xl bg-accent p-4 text-sm text-ink-2">
          Como PJ, não tem desconto de INSS e IRRF na folha: o plano usa esse valor como o que entra na sua conta. Na
          tela do plano, o grupo Imposto ajuda a separar o que vai pro imposto.
        </p>
      ) : ehBruto ? (
        <>
          <div className="enter-up grid gap-2 rounded-2xl bg-accent p-4">
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-2">
              <span className="eyebrow">Estimativa do líquido</span>
              {holerite ? (
                <CountUp value={holerite.liquido} format={brlCentavos} className="tnum text-xl font-bold text-foreground" />
              ) : (
                <span className="tnum text-xl font-bold text-foreground">—</span>
              )}
            </div>
            {holerite && (
              <p className="tnum text-sm text-ink-2">
                INSS {formatBRL(holerite.inss, { centavos: true })} ·{" "}
                {holerite.irrf > 0 ? `IRRF ${formatBRL(holerite.irrf, { centavos: true })}` : "IRRF isento"}
                {holerite.valeTransporte !== undefined &&
                  ` · VT ${formatBRL(holerite.valeTransporte, { centavos: true })}`}
              </p>
            )}
            <p className="text-sm text-ink-2">
              Estimativa do mês normal, com as tabelas de {TABELAS_FOLHA.competencia.slice(0, 4)}. Seu holerite pode dar
              diferente em mês de férias, no 13º, ou se você tem hora extra, comissão, pensão ou mais de um emprego.
            </p>
            {abaixoDoMinimo && (
              <p className="text-sm font-bold text-warn">
                Esse valor está abaixo do salário mínimo. Se for estágio ou meio período, o desconto costuma ser outro —
                confira no holerite.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                trocarModo("liquida");
                // o botão some junto com o bloco do bruto; o foco vai pro campo, que passa a pedir o líquido
                document.getElementById(ids.controle)?.focus();
              }}
              className="press inline-flex min-h-11 items-center justify-self-start rounded-md text-sm font-bold text-primary underline underline-offset-4 outline-none hover:text-brand-deep focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Não bateu? Digitar o líquido
            </button>
          </div>

          {/* o rótulo visível é o do próprio campo: um segundo <label for> faria o leitor de tela ler o nome duas vezes */}
          <NumberInput
            id="renda-dependentes"
            label="Dependentes no imposto de renda"
            value={respostas.dependentes ?? 0}
            onChange={(dependentes) => mudarBruto(respostas.salarioBruto, dependentes ?? 0)}
            parse={(t) => {
              const digitos = t.replace(/\D/g, "").slice(0, 2);
              return digitos === "" ? 0 : Math.min(10, Number(digitos));
            }}
            format={String}
            campoClassName="max-w-32"
          />
        </>
      ) : (
        <>
          <ChipsValor
            valores={[1500, 2500, 4000, 6000]}
            value={respostas.rendaMensal}
            onChange={(rendaMensal) => {
              onChange({ rendaMensal });
              setFlash((f) => f + 1);
            }}
          />
          <ValueSlider
            value={respostas.rendaMensal}
            onChange={(rendaMensal) => onChange({ rendaMensal })}
            min={500}
            max={20000}
            step={50}
            labelledBy={ids.titulo}
            format={BRL}
          />
        </>
      )}

      <BeneficiosEditor
        beneficios={respostas.beneficios}
        onChange={mudarBeneficios}
        erro={problemaVale?.mensagem}
        erroEm={erroNaLinha(problemaVale?.caminho)}
        falta={faltaVale}
        descontoVT={holerite?.valeTransporte}
        idMensagem="beneficios-mensagem"
      />
    </div>
  );
}

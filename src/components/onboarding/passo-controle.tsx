import type { Moradia, TipoRenda } from "@/domain";
import { cn } from "@/lib/utils";
import { ChipsValor } from "./chips";
import { DividasEditor } from "./dividas-editor";
import { GastosEditor } from "./gastos-editor";
import { MoneyInput } from "./money-input";
import { NumberInput } from "./number-input";
import { OptionCards } from "./option-cards";
import type { Passo } from "./passos";
import { moradiaSemCusto, type Respostas } from "./respostas";
import { ValueSlider } from "./value-slider";

/*
  O controle de cada pergunta. As perguntas em si vivem em passos.ts; aqui
  fica só como cada uma é respondida. A linha de erro vem colada no campo
  (e não depois dos chips e do slider), pra ler como parte dele.
*/

const BRL: Intl.NumberFormatOptions = { style: "currency", currency: "BRL", maximumFractionDigits: 0 };

const OPCOES_RENDA: readonly { value: TipoRenda; titulo: string; descricao: string }[] = [
  { value: "clt", titulo: "Salário fixo", descricao: "CLT, cai todo mês mais ou menos igual" },
  { value: "pj", titulo: "PJ ou autônomo", descricao: "Nota fiscal, MEI, freela regular" },
  { value: "informal", titulo: "Varia muito", descricao: "Bico, comissão, informal" },
];

const OPCOES_MORADIA: readonly { value: Moradia; titulo: string; descricao: string }[] = [
  { value: "pais", titulo: "Com os pais ou família", descricao: "Sem aluguel" },
  { value: "aluguel", titulo: "De aluguel", descricao: "Sozinho(a), pagando tudo" },
  { value: "dividido", titulo: "Divido o aluguel", descricao: "Só a sua parte conta" },
  { value: "propria", titulo: "Casa própria quitada", descricao: "Sem parcela" },
  { value: "financiada", titulo: "Casa financiada", descricao: "Ainda pagando" },
];

function lerIdade(texto: string): number | undefined {
  const digitos = texto.replace(/\D/g, "").slice(0, 3);
  return digitos === "" ? undefined : Number(digitos);
}

/** Moradia sem custo zera o valor; ao sair de uma sem custo, a pergunta volta em branco. */
function custoMoradiaPara(nova: Moradia, r: Respostas): number | undefined {
  if (moradiaSemCusto(nova)) return 0;
  return moradiaSemCusto(r.moradia) ? undefined : r.custoMoradia;
}

export interface ControleIds {
  titulo: string;
  controle: string;
  erro: string;
}

interface PassoControleProps {
  passo: Passo;
  respostas: Respostas;
  onChange: (patch: Partial<Respostas>) => void;
  erro?: string;
  ids: ControleIds;
  describedBy: string;
  invalid: boolean;
}

export function PassoControle({ passo, respostas, onChange, erro, ids, describedBy, invalid }: PassoControleProps) {
  switch (passo.id) {
    case "rendaMensal":
      return (
        <div className="grid gap-5">
          <div className="grid gap-2">
            <MoneyInput
              id={ids.controle}
              label={passo.pergunta}
              hideLabel
              autoFocus
              value={respostas.rendaMensal}
              onChange={(rendaMensal) => onChange({ rendaMensal })}
              describedBy={describedBy}
              invalid={invalid}
            />
            <LinhaErro id={ids.erro} erro={erro} />
          </div>
          <ChipsValor
            valores={[1500, 2500, 4000, 6000]}
            value={respostas.rendaMensal}
            onChange={(rendaMensal) => onChange({ rendaMensal })}
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
        </div>
      );

    case "tipoRenda":
      return (
        <>
          <OptionCards
            name="tipoRenda"
            legend={passo.pergunta}
            options={OPCOES_RENDA}
            value={respostas.tipoRenda}
            onChange={(tipoRenda) => onChange({ tipoRenda })}
            describedBy={describedBy}
          />
          <LinhaErro id={ids.erro} erro={erro} />
        </>
      );

    case "idade":
      return (
        <div className="grid gap-5">
          <div className="grid gap-2">
            <NumberInput
              id={ids.controle}
              label={passo.pergunta}
              hideLabel
              autoFocus
              value={respostas.idade}
              onChange={(idade) => onChange({ idade })}
              parse={lerIdade}
              format={String}
              suffix="anos"
              describedBy={describedBy}
              invalid={invalid}
              className="max-w-48"
            />
            <LinhaErro id={ids.erro} erro={erro} />
          </div>
          <ValueSlider
            value={respostas.idade}
            onChange={(idade) => onChange({ idade })}
            min={14}
            max={70}
            labelledBy={ids.titulo}
          />
        </div>
      );

    case "moradia":
      return (
        <>
          <OptionCards
            name="moradia"
            legend={passo.pergunta}
            options={OPCOES_MORADIA}
            value={respostas.moradia}
            onChange={(moradia) =>
              onChange({ moradia, custoMoradia: custoMoradiaPara(moradia, respostas) })
            }
            describedBy={describedBy}
          />
          <LinhaErro id={ids.erro} erro={erro} />
        </>
      );

    case "custoMoradia":
      return (
        <CampoValor
          passo={passo}
          valores={[500, 800, 1200, 1800]}
          value={respostas.custoMoradia}
          onChange={(custoMoradia) => onChange({ custoMoradia })}
          erro={erro}
          ids={ids}
          describedBy={describedBy}
          invalid={invalid}
        />
      );

    case "gastosFixos":
      return (
        <>
          <GastosEditor
            gastos={respostas.gastosFixos}
            onChange={(gastosFixos) => onChange({ gastosFixos })}
            legend={passo.pergunta}
            describedBy={describedBy}
          />
          <LinhaErro id={ids.erro} erro={erro} />
        </>
      );

    case "dividas":
      return (
        <>
          <DividasEditor
            dividas={respostas.dividas}
            onChange={(dividas) => onChange({ dividas })}
            legend={passo.pergunta}
            describedBy={describedBy}
          />
          <LinhaErro id={ids.erro} erro={erro} />
        </>
      );

    case "guardado":
      return (
        <CampoValor
          passo={passo}
          valores={[0, 500, 2000, 5000]}
          value={respostas.guardado}
          onChange={(guardado) => onChange({ guardado })}
          erro={erro}
          ids={ids}
          describedBy={describedBy}
          invalid={invalid}
        />
      );
  }
}

interface CampoValorProps {
  passo: Passo;
  valores: readonly number[];
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  erro?: string;
  ids: ControleIds;
  describedBy: string;
  invalid: boolean;
}

/** Valor em reais com atalhos: o formato das perguntas 5, 6 e 8. */
function CampoValor({ passo, valores, value, onChange, erro, ids, describedBy, invalid }: CampoValorProps) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <MoneyInput
          id={ids.controle}
          label={passo.pergunta}
          hideLabel
          autoFocus
          value={value}
          onChange={onChange}
          describedBy={describedBy}
          invalid={invalid}
        />
        <LinhaErro id={ids.erro} erro={erro} />
      </div>
      <ChipsValor valores={valores} value={value} onChange={onChange} />
    </div>
  );
}

/** A linha de erro do passo. Vazia, fica sr-only mas no DOM: é a região live que anuncia o erro quando ele aparece. */
function LinhaErro({ id, erro }: { id: string; erro?: string }) {
  return (
    <p id={id} aria-live="polite" className={cn("text-sm font-bold text-warn", !erro && "sr-only")}>
      {erro}
    </p>
  );
}

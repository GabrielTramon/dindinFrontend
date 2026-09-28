import { useMemo, useState } from "react";
import { novoId } from "@/components/resultado/pote-comum";
import {
  gerarPlano,
  opcoesGuardadoNaMeta,
  rotuloMeta,
  TABELAS_FOLHA,
  validarPerfil,
  type Moradia,
  type TipoRenda,
} from "@/domain";
import { cn } from "@/lib/utils";
import { ChipsValor } from "./chips";
import { DecimoTerceiroPergunta } from "./decimo-terceiro-pergunta";
import { DividasEditor } from "./dividas-editor";
import { GastosEditor } from "./gastos-editor";
import { GuardadoNaMetaPergunta } from "./guardado-na-meta";
import { MetaEditor } from "./meta-editor";
import { MoneyInput } from "./money-input";
import { NumberInput } from "./number-input";
import { OptionCards } from "./option-cards";
import { erroNaLinha, textoDoPasso, type Passo } from "./passos";
import { RendaControle } from "./renda-controle";
import { holeriteDasRespostas, montarPerfil, moradiaSemCusto, type Respostas } from "./respostas";
import { ValueSlider } from "./value-slider";

/*
  O controle de cada pergunta. As perguntas em si vivem em passos.ts; aqui
  fica só como cada uma é respondida. A linha de erro vem colada no campo
  (e não depois dos chips e do slider), pra ler como parte dele.
*/

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

/**
 * A pergunta 1 vem antes do tipo de renda: quem informou o bruto teve o líquido
 * calculado com a tabela de CLT. Trocar o tipo refaz essa conta — PJ não tem
 * desconto de folha, então o bruto dele é o que entra na conta (a mesma regra
 * de holeriteDasRespostas e montarPerfil); voltar pra CLT recalcula o líquido.
 */
function rendaParaTipo(tipoRenda: TipoRenda, r: Respostas): Partial<Respostas> {
  // o 13º é outra pergunta pra CLT ("usar no plano?") e pra PJ ("o contrato paga?"): trocou o tipo, pergunta de novo
  const decimo = tipoRenda === r.tipoRenda ? {} : { decimoTerceiro: undefined };
  if (r.rendaInformada !== "bruta" || r.salarioBruto === undefined) return { tipoRenda, ...decimo };
  const holerite = holeriteDasRespostas({ ...r, tipoRenda });
  return {
    tipoRenda,
    ...decimo,
    rendaMensal: holerite ? holerite.liquido : r.salarioBruto,
    competenciaTabela: holerite ? TABELAS_FOLHA.competencia : undefined,
  };
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
  const pergunta = textoDoPasso(passo.pergunta, respostas) ?? "";
  // qual campo o erro aponta (a linha do gasto, o nome da meta…), pra ele e só ele receber aria-invalid
  const caminho = erro !== undefined ? passo.campoDoErro?.(respostas) : undefined;
  // sem erro e com o Continuar travado: o que falta preencher (uma linha pela metade)
  const falta = erro === undefined && !passo.valido(respostas) ? passo.falta?.(respostas) : undefined;

  switch (passo.id) {
    case "rendaMensal":
      return (
        <RendaControle
          respostas={respostas}
          onChange={onChange}
          ids={ids}
          describedBy={describedBy}
          invalid={invalid}
          erro={<LinhaErro id={ids.erro} erro={erro} />}
          pergunta={pergunta}
        />
      );

    case "meta":
      return (
        <>
          <MetaEditor
            meta={respostas.meta}
            onChange={(meta) => onChange({ meta })}
            legend={pergunta}
            idValor={ids.controle}
            idErro={ids.erro}
            describedBy={describedBy}
            // erro sem caminho (ex.: não deu pra salvar no fim) não é culpa de campo nenhum
            erroEm={caminho?.[0] === "nome" ? "nome" : caminho?.[0] === "valorAlvo" ? "valorAlvo" : undefined}
          />
          <GuardadoNaMetaDoOnboarding respostas={respostas} onChange={onChange} />
          <LinhaErro id={ids.erro} erro={erro} falta={falta} />
        </>
      );

    case "tipoRenda":
      return (
        <>
          <OptionCards
            name="tipoRenda"
            legend={pergunta}
            options={OPCOES_RENDA}
            value={respostas.tipoRenda}
            onChange={(tipoRenda) => onChange(rendaParaTipo(tipoRenda, respostas))}
            describedBy={describedBy}
          />
          {(respostas.tipoRenda === "clt" || respostas.tipoRenda === "pj") && (
            <DecimoTerceiroPergunta respostas={respostas} onChange={onChange} describedBy={ids.erro} />
          )}
          <LinhaErro id={ids.erro} erro={erro} falta={falta} />
          {/* região live sempre no DOM: o aviso aparece ao escolher PJ e precisa ser anunciado */}
          <div aria-live="polite">
            {respostas.tipoRenda === "pj" && respostas.rendaInformada === "bruta" && (
              <p className="enter-up rounded-2xl bg-accent p-4 text-sm text-ink-2">
                Como PJ, não tem desconto de INSS e IRRF na folha: o plano usa o valor da primeira pergunta como o que
                entra na sua conta. Na tela do plano, o grupo Imposto ajuda a separar o que vai pro imposto.
              </p>
            )}
          </div>
        </>
      );

    case "idade":
      // sem chips aqui: o slider NÃO dispara o flash do campo
      return (
        <div className="grid gap-5">
          <div className="grid gap-2">
            <NumberInput
              id={ids.controle}
              label={pergunta}
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
            // o mesmo teto do schema (perfilSchema.idade): menor, o slider trocaria uma idade válida pelo teto
            min={14}
            max={100}
            labelledBy={ids.titulo}
          />
        </div>
      );

    case "moradia":
      return (
        <>
          <OptionCards
            name="moradia"
            legend={pergunta}
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
          pergunta={pergunta}
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
            legend={pergunta}
            describedBy={describedBy}
            idErro={ids.erro}
            erroEm={erroNaLinha(caminho)}
            beneficios={respostas.beneficios}
          />
          <LinhaErro id={ids.erro} erro={erro} falta={falta} />
        </>
      );

    case "dividas":
      return (
        <>
          <DividasEditor
            dividas={respostas.dividas}
            onChange={(dividas) => onChange({ dividas })}
            legend={pergunta}
            describedBy={describedBy}
            idErro={ids.erro}
            erroEm={erroNaLinha(caminho)}
          />
          <LinhaErro id={ids.erro} erro={erro} falta={falta} />
        </>
      );

    case "guardado":
      return (
        <CampoValor
          pergunta={pergunta}
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
  pergunta: string;
  valores: readonly number[];
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  erro?: string;
  ids: ControleIds;
  describedBy: string;
  invalid: boolean;
}

/** Valor em reais com atalhos: o formato das perguntas 5, 6 e 8. Tocar num chip faz o campo piscar o anel (flashKey). */
function CampoValor({ pergunta, valores, value, onChange, erro, ids, describedBy, invalid }: CampoValorProps) {
  const [flash, setFlash] = useState(0);

  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <MoneyInput
          id={ids.controle}
          label={pergunta}
          hideLabel
          autoFocus
          value={value}
          onChange={onChange}
          describedBy={describedBy}
          invalid={invalid}
          flashKey={flash}
        />
        <LinhaErro id={ids.erro} erro={erro} />
      </div>
      <ChipsValor
        valores={valores}
        value={value}
        onChange={(n) => {
          onChange(n);
          setFlash((f) => f + 1);
        }}
      />
    </div>
  );
}

/**
 * A pergunta "o que você já tem guardado entra na meta?", logo abaixo do valor
 * da meta. Só aparece pra quem tem algo guardado e já disse quanto a meta custa.
 * A reserva sai de um plano montado com as respostas de agora (todas as
 * perguntas de antes já foram respondidas quando se chega aqui).
 */
function GuardadoNaMetaDoOnboarding({
  respostas,
  onChange,
}: {
  respostas: Respostas;
  onChange: (patch: Partial<Respostas>) => void;
}) {
  const meta = respostas.meta;
  const opcoes = useMemo(() => {
    if (!((respostas.guardado ?? 0) > 0)) return null;
    // sem a meta: a reserva não depende dela, e uma meta pela metade reprovaria o perfil
    const r = validarPerfil(montarPerfil({ ...respostas, meta: undefined }));
    return r.ok ? opcoesGuardadoNaMeta(gerarPlano(r.perfil)) : null;
  }, [respostas]);
  if (!opcoes || !meta || !(meta.valorAlvo > 0)) return null;
  const nomeMeta = meta.tipo === "outro" && !meta.nome?.trim() ? "sua meta" : rotuloMeta(meta);
  return (
    <div className="enter-up mt-2 border-t pt-6">
      <GuardadoNaMetaPergunta
        id="meta-guardado"
        nomeMeta={nomeMeta}
        opcoes={opcoes}
        guardados={meta.guardados}
        onChange={(guardados) => {
          const novo = { ...meta };
          if (guardados === undefined) delete novo.guardados;
          else novo.guardados = guardados;
          onChange({ meta: novo });
        }}
        novoId={novoId}
      />
    </div>
  );
}

/**
 * A linha de erro do passo. Vazia, fica sr-only mas no DOM: é a região live que
 * anuncia o erro quando ele aparece. O texto remonta (key) e sobe suave a cada
 * mensagem nova; a região em si nunca sai do DOM.
 *
 * `falta` usa a mesma linha, em tom neutro: não é erro, é o motivo do Continuar
 * estar travado (uma linha de gasto ou de dívida pela metade).
 */
function LinhaErro({ id, erro, falta }: { id: string; erro?: string; falta?: string }) {
  const texto = erro ?? falta;
  return (
    <p
      id={id}
      aria-live="polite"
      className={cn("text-sm", erro ? "font-bold text-warn" : "text-ink-2", !texto && "sr-only")}
    >
      {texto && (
        <span key={texto} className="rise-in block">
          {texto}
        </span>
      )}
    </p>
  );
}

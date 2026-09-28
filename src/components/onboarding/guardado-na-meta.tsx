"use client";

import { useId, useState } from "react";
import { TextField } from "@/components/ui/text-field";
import {
  comTotalGuardado,
  MAX_RENDIMENTO_MENSAL,
  totalGuardadoNaMeta,
  type GuardadoNaMeta,
  type OpcoesGuardadoNaMeta,
} from "@/domain";
import { formatBRL, mascaraTaxa, taxaDoTexto, textoDaTaxa } from "@/lib/format";
import { MoneyInput } from "./money-input";
import { OptionCards } from "./option-cards";

/*
  "O que você já tem guardado entra nessa meta?" — a pergunta que decide se a
  meta começa do zero ou do que a pessoa já juntou.

  As escolhas saem dos números dela: "só o que passa da reserva" é a
  recomendada (a reserva de emergência fica onde está); "tudo" e "outro valor"
  são livres, com o aviso honesto de que a reserva volta a faltar e o plano
  junta ela de novo antes da meta. Nada trava.

  Serve ao onboarding (passo da meta) e à gaveta da tela do plano: recebe os
  potes e devolve os potes (`guardados`), sempre com a mesma forma.
  `undefined` = ainda não respondeu; [] = "não".
*/

const MAX_PCT_RENDIMENTO = MAX_RENDIMENTO_MENSAL * 100;

type Escolha = "nao" | "excedente" | "tudo" | "outro";

const cent = (v: number) => Math.round(v * 100);

export interface GuardadoNaMetaPerguntaProps {
  /** prefixo dos ids (um por tela) */
  id: string;
  /** o nome da meta, pra pergunta: "Casa" */
  nomeMeta: string;
  opcoes: OpcoesGuardadoNaMeta;
  guardados: GuardadoNaMeta[] | undefined;
  onChange: (guardados: GuardadoNaMeta[] | undefined) => void;
  novoId: () => string;
  /** pergunta visível como texto (onboarding) ou só pro leitor de tela (a gaveta já tem título) */
  perguntaVisivel?: boolean;
}

export function GuardadoNaMetaPergunta({
  id,
  nomeMeta,
  opcoes,
  guardados,
  onChange,
  novoId,
  perguntaVisivel = true,
}: GuardadoNaMetaPerguntaProps) {
  const { guardado, reserva, excedente } = opcoes;
  const idAviso = useId();
  // o que a tela mostra nunca passa do guardado (ele pode ter baixado depois)
  const total = guardados === undefined ? undefined : Math.min(totalGuardadoNaMeta({ tipo: "outro", valorAlvo: 1, guardados }), guardado);

  const derivada: Escolha | undefined =
    total === undefined
      ? undefined
      : total <= 0
        ? "nao"
        : excedente > 0 && cent(total) === cent(excedente)
          ? "excedente"
          : cent(total) === cent(guardado)
            ? "tudo"
            : "outro";
  const [outroAberto, setOutroAberto] = useState(derivada === "outro");
  const escolha = outroAberto ? "outro" : derivada;

  const pergunta = `Os ${formatBRL(guardado)} que você já tem guardados entram na meta ${nomeMeta}?`;
  const opcoesDeCard = [
    {
      value: "nao" as const,
      titulo: "Não, é minha reserva",
      descricao: "A meta começa do zero e o que você tem continua protegido.",
    },
    ...(excedente > 0
      ? [
          {
            value: "excedente" as const,
            titulo: `Só o que passa da reserva: ${formatBRL(excedente)}`,
            descricao: `Recomendado. Sua reserva de emergência (${formatBRL(reserva)}) fica guardada.`,
          },
        ]
      : []),
    {
      value: "tudo" as const,
      titulo: `Tudo: ${formatBRL(guardado)}`,
      descricao:
        excedente > 0
          ? `A reserva volta a faltar: o plano junta ${formatBRL(reserva)} de novo antes de ir pra meta.`
          : `Hoje isso é a sua reserva (${formatBRL(reserva)}): o plano junta ela de novo antes de ir pra meta.`,
    },
    { value: "outro" as const, titulo: "Outro valor", descricao: "Você escolhe quanto." },
  ];

  function escolher(e: Escolha) {
    setOutroAberto(e === "outro");
    if (e === "nao") onChange([]);
    else if (e === "excedente") onChange(comTotalGuardado(guardados, excedente, novoId));
    else if (e === "tudo") onChange(comTotalGuardado(guardados, guardado, novoId));
    // "outro": o valor muda quando ela digitar; até lá fica o que estava
  }

  const tiraDaReserva = total !== undefined && total > excedente ? total - excedente : 0;

  return (
    <div className="grid min-w-0 gap-4">
      {perguntaVisivel && (
        <p aria-hidden="true" className="text-lg leading-snug font-extrabold text-pretty">
          {pergunta}
        </p>
      )}
      <OptionCards name={`${id}-escolha`} legend={pergunta} options={opcoesDeCard} value={escolha} onChange={escolher} />

      {escolha === "outro" && (
        <MoneyInput
          id={`${id}-valor`}
          label={`Quanto vai pra ${nomeMeta}`}
          size="md"
          value={total}
          describedBy={tiraDaReserva > 0 ? idAviso : undefined}
          // nunca mais do que ela tem: o resto não existe
          onChange={(v) =>
            onChange(v === undefined ? undefined : comTotalGuardado(guardados, Math.min(Math.max(0, v), guardado), novoId))
          }
          className="enter-up"
        />
      )}

      {tiraDaReserva > 0 && escolha !== "tudo" && (
        <p id={idAviso} className="text-sm text-ink-2 tnum">
          {formatBRL(tiraDaReserva)} disso sai da reserva: o plano completa ela antes de ir pra meta.
        </p>
      )}

      {total !== undefined && total > 0 && guardados && (
        <CampoRendimentoDoGuardado id={`${id}-rendimento`} guardados={guardados} onChange={onChange} />
      )}
    </div>
  );
}

interface CampoRendimentoDoGuardadoProps {
  id: string;
  guardados: GuardadoNaMeta[];
  onChange: (guardados: GuardadoNaMeta[]) => void;
}

/**
 * "Quanto esse dinheiro rende por mês?" — opcional, no primeiro pote. Com mais
 * de um pote (dividido na tela do plano), cada um tem o seu lá.
 */
function CampoRendimentoDoGuardado({ id, guardados, onChange }: CampoRendimentoDoGuardadoProps) {
  const [digitado, setDigitado] = useState<string | null>(null);
  const idAjuda = `${id}-ajuda`;
  const comValor = guardados.filter((g) => g.valor > 0);
  if (comValor.length > 1) {
    return (
      <p className="text-sm text-ink-2">
        Esse dinheiro está dividido em {comValor.length} potes: o rendimento de cada um fica na tela do plano.
      </p>
    );
  }
  const primeiro = comValor[0] ?? guardados[0];
  const texto = digitado ?? textoDaTaxa(primeiro?.rendimentoMensal);

  function digitar(bruto: string) {
    const limpo = mascaraTaxa(bruto, MAX_PCT_RENDIMENTO);
    setDigitado(limpo);
    const taxa = taxaDoTexto(limpo, MAX_PCT_RENDIMENTO) ?? undefined;
    onChange(
      guardados.map((g) => {
        if (g.id !== primeiro.id) return g;
        const novo: GuardadoNaMeta = { ...g, rendimentoMensal: taxa };
        // chave ausente, nunca `undefined`: é o que o schema e a API esperam
        if (taxa === undefined) delete novo.rendimentoMensal;
        return novo;
      }),
    );
  }

  return (
    <div className="enter-up grid min-w-0 gap-1.5">
      <TextField
        id={id}
        label="Quanto esse dinheiro rende por mês? (opcional)"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,8"
        value={texto}
        onChange={(e) => digitar(e.target.value)}
        onBlur={() => setDigitado(null)}
        suffix="% ao mês"
        aria-describedby={idAjuda}
        className="max-w-72 tnum"
      />
      <p id={idAjuda} className="text-sm text-ink-2">
        Ex.: 0,8 = 0,8% ao mês. Vazio = não rende. O prazo da meta já conta com isso.
      </p>
    </div>
  );
}

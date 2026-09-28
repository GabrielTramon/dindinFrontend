import { valorDoDecimoTerceiro } from "@/domain";
import { formatBRL } from "@/lib/format";
import { ChipsRadio } from "./chips";
import type { Respostas } from "./respostas";

/*
  O 13º, embaixo do "fixo ou varia?" (pergunta 2). Só pra CLT e PJ — informal
  não recebe, e a pergunta nem aparece.

  São duas perguntas diferentes com a mesma resposta (sim/não): pra CLT o 13º
  é certo, e a pergunta é se ele entra no plano; pra PJ ele só existe se o
  contrato pagar. Trocar o tipo de renda limpa a resposta (rendaParaTipo).

  Com "sim", a estimativa aparece na hora: o líquido de um mês, em dezembro.
*/

type Resposta = "sim" | "nao";

const TEXTOS = {
  clt: {
    titulo: "E o 13º salário?",
    ajuda:
      "Ele cai em dezembro. Usando no plano, ele vai inteiro pro passo da vez e os prazos encurtam. O quanto guardar por mês não muda.",
    opcoes: [
      { value: "sim", label: "Usar no plano" },
      { value: "nao", label: "Não usar" },
    ],
  },
  pj: {
    titulo: "Considerar 13º?",
    ajuda: "Alguns contratos PJ pagam um 13º no fim do ano. Só marque sim se o seu paga.",
    opcoes: [
      { value: "sim", label: "Sim, meu contrato paga" },
      { value: "nao", label: "Não" },
    ],
  },
} as const;

interface DecimoTerceiroPerguntaProps {
  respostas: Respostas;
  onChange: (patch: Partial<Respostas>) => void;
  /** a linha de "falta" do passo */
  describedBy?: string;
}

export function DecimoTerceiroPergunta({ respostas, onChange, describedBy }: DecimoTerceiroPerguntaProps) {
  if (respostas.tipoRenda !== "clt" && respostas.tipoRenda !== "pj") return null;
  const textos = TEXTOS[respostas.tipoRenda];
  const valor: Resposta | undefined =
    respostas.decimoTerceiro === undefined ? undefined : respostas.decimoTerceiro ? "sim" : "nao";

  // a mesma conta do motor; linha de vale em branco não conta
  const estimativa =
    respostas.decimoTerceiro === true
      ? valorDoDecimoTerceiro({
          decimoTerceiro: true,
          tipoRenda: respostas.tipoRenda,
          rendaMensal: respostas.rendaMensal ?? 0,
          rendaInformada: respostas.rendaInformada,
          salarioBruto: respostas.salarioBruto,
          beneficios: respostas.beneficios?.flatMap((b) => (b.valor === undefined ? [] : [{ ...b, valor: b.valor }])),
        })
      : 0;

  return (
    <div className="enter-up mt-2 grid gap-3 border-t pt-6">
      <div className="grid gap-1">
        <p id="decimo-titulo" className="font-bold">
          {textos.titulo}
        </p>
        <p className="text-sm text-ink-2">{textos.ajuda}</p>
      </div>
      <ChipsRadio<Resposta>
        name="decimoTerceiro"
        label={textos.titulo}
        options={textos.opcoes}
        value={valor}
        onChange={(v) => onChange({ decimoTerceiro: v === "sim" })}
        describedBy={describedBy}
      />
      <div aria-live="polite">
        {estimativa > 0 && (
          <p className="enter-up text-sm text-ink-2 tnum">
            Estimativa: {formatBRL(estimativa)} em dezembro, o líquido de um mês. Quem entrou no meio do ano recebe
            proporcional.
          </p>
        )}
      </div>
    </div>
  );
}

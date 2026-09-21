import { CountUp } from "@/components/motion/count-up";
import { staggerStyle } from "@/components/motion/stagger";
import { Marcador, SegmentBar } from "@/components/ui/segment-bar";
import type { Alocacao } from "@/domain";
import { formatBRL } from "@/lib/format";

/*
  Pra onde vai o excedente: a barra divide aporte (vai pra cascata) e livre
  (gasto sem culpa); a lista mostra em que degrau cada real do aporte cai.
  A barra cresce da esquerda e recebe uma luz; os itens entram em cascata
  depois dela (i + 2) e cada valor conta até o número.
*/

type DestinoProps = {
  aporte: number;
  livre: number;
  alocacoes: Alocacao[];
};

export function Destino({ aporte, livre, alocacoes }: DestinoProps) {
  return (
    <section aria-labelledby="destino-titulo">
      <h2 id="destino-titulo" className="text-lg font-extrabold tracking-tight sm:text-xl">
        Pra onde vai o dinheiro este mês
      </h2>

      <div className="mt-4">
        <SegmentBar
          height="md"
          enter
          label={`${formatBRL(aporte)} pro plano e ${formatBRL(livre)} livre pra você`}
          segments={[
            { value: aporte, className: "bg-primary" },
            { value: livre, className: "bg-chart-3" },
          ]}
        />
        <p className="mt-2 text-sm text-ink-2 tnum">
          <Marcador className="bg-primary" /> {formatBRL(aporte)} pro plano ·{" "}
          <Marcador className="bg-chart-3" /> {formatBRL(livre)} livre pra você
        </p>
      </div>

      <ul className="mt-6 border-b">
        {alocacoes.map((a, i) => (
          <li
            key={a.destino}
            className="rise-in flex gap-4 border-t py-4"
            style={staggerStyle(i + 2)}
          >
            <span className="w-24 shrink-0 font-extrabold text-primary tnum sm:w-28">
              <CountUp value={a.valor} />
            </span>
            <div className="min-w-0">
              <p className="font-bold">{a.titulo}</p>
              <p className="mt-0.5 text-sm text-ink-2">{a.descricao}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-ink-2">
        O que fica livre — <span className="tnum">{formatBRL(livre)}</span> — é seu. Sem culpa e
        sem planilha.
      </p>
    </section>
  );
}

import type { Alocacao } from "@/domain";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
  Pra onde vai o excedente: a barra divide aporte (vai pra cascata) e livre
  (gasto sem culpa); a lista mostra em que degrau cada real do aporte cai.
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
        <div
          role="img"
          aria-label={`${formatBRL(aporte)} pro plano e ${formatBRL(livre)} livre pra você`}
          className="flex h-3 overflow-hidden rounded-full bg-muted"
        >
          <div className="min-w-0 basis-0 bg-primary" style={{ flexGrow: aporte }} />
          <div className="min-w-0 basis-0 bg-chart-3" style={{ flexGrow: livre }} />
        </div>
        <p className="mt-2 text-sm text-ink-2 tnum">
          <Marcador className="bg-primary" /> {formatBRL(aporte)} pro plano ·{" "}
          <Marcador className="bg-chart-3" /> {formatBRL(livre)} livre pra você
        </p>
      </div>

      <ul className="mt-6 border-b border-border">
        {alocacoes.map((a) => (
          <li key={a.destino} className="flex gap-4 border-t border-border py-4">
            <span className="w-24 shrink-0 font-extrabold text-primary tnum sm:w-28">
              {formatBRL(a.valor)}
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

function Marcador({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block size-2.5 rounded-full align-middle", className)}
    />
  );
}

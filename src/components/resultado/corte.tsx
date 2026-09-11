import type { PlanoDeCorte } from "@/domain";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ListaNumerada } from "./lista-numerada";

/*
  Quando os custos passam da renda, o mês é de corte, não de aporte.
  Entra no lugar de "Pra onde vai o dinheiro". Se a renda fecha exatamente
  com os custos (déficit zero), a decisão já explica — o "Faltam" some.
*/

export function Corte({ corte }: { corte: PlanoDeCorte }) {
  const temDeficit = corte.deficit > 0;

  return (
    <section aria-labelledby="corte-titulo">
      <h2 id="corte-titulo" className="text-lg font-extrabold tracking-tight sm:text-xl">
        Plano de corte
      </h2>
      {temDeficit && (
        <p className="mt-3 text-xl font-extrabold tracking-tight text-warn sm:text-2xl">
          Faltam <span className="tnum">{formatBRL(corte.deficit)}</span> por mês pra fechar a conta
        </p>
      )}
      <p className={cn("text-ink-2", temDeficit ? "mt-2" : "mt-3")}>{corte.metaTexto}</p>
      <h3 className="mt-6 text-xs font-bold tracking-wider text-muted-foreground uppercase">
        Por onde começar
      </h3>
      <ListaNumerada className="mt-3" itens={corte.sugestoes} />
    </section>
  );
}

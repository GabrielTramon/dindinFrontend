import { ROTULO_DEGRAU, type Degrau } from "@/domain";

/*
  Eyebrow com o mês do plano e o degrau atual da cascata (embaixo no celular,
  à direita a partir de 640px).
  O mês é calculado no navegador — este componente só monta depois que o
  perfil foi lido, então nunca renderiza no servidor.
*/

export function Cabecalho({ degrau }: { degrau: Degrau }) {
  const periodo = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(),
  );

  return (
    <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
        Seu plano de {periodo}
      </p>
      <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-ink-2">
        <span className="sr-only">Degrau atual:</span>
        <span className="text-muted-foreground tnum">0{degrau}</span>
        {ROTULO_DEGRAU[degrau]}
      </p>
    </div>
  );
}

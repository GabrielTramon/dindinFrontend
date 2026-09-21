import { Pill } from "@/components/ui/pill";
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
      <p className="eyebrow">Seu plano de {periodo}</p>
      <Pill size="sm" tone="outline">
        <span className="sr-only">Degrau atual:</span>
        <span className="text-muted-foreground tnum">0{degrau}</span>
        {ROTULO_DEGRAU[degrau]}
      </Pill>
    </div>
  );
}

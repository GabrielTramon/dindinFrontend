import { Progress } from "@/components/ui/progress";

/*
  "Pergunta N de T" e a barra. O texto é live pra leitor de tela saber que
  avançou; a barra é só reforço visual.
*/

interface ProgressoProps {
  atual: number;
  total: number;
}

export function Progresso({ atual, total }: ProgressoProps) {
  const pct = total > 0 ? Math.round((atual / total) * 100) : 0;

  return (
    <div className="grid gap-2.5">
      <p
        aria-live="polite"
        className="text-xs font-bold tracking-wider text-muted-foreground uppercase tnum"
      >
        Pergunta {atual} de {total}
      </p>
      <Progress
        value={pct}
        aria-label="Andamento das perguntas"
        className="[&_[data-slot=progress-track]]:h-1.5"
      />
    </div>
  );
}

import { Progress } from "@/components/ui/progress";

/*
  "Pergunta N de T" e a barra. O texto é live pra leitor de tela saber que
  avançou; a barra é só reforço visual. O número remonta (key) e sobe ao
  trocar; a barra cresce com ponta de luz (transition do Indicator).
*/

interface ProgressoProps {
  atual: number;
  total: number;
}

export function Progresso({ atual, total }: ProgressoProps) {
  const pct = total > 0 ? Math.round((atual / total) * 100) : 0;

  return (
    <div className="grid gap-2.5">
      <p aria-live="polite" className="eyebrow tnum">
        Pergunta{" "}
        <span key={atual} className="rise-in inline-block">
          {atual}
        </span>{" "}
        de {total}
      </p>
      <Progress value={pct} aria-label="Andamento das perguntas" />
    </div>
  );
}

import { cn } from "@/lib/utils";

/*
  Barra de progresso de um valor em direção a um alvo. Só CSS, sem biblioteca:
  o preenchimento enche de 0 até o alvo ao entrar no DOM (grow-in-w) e uma luz
  atravessa a barra uma vez depois disso (bar-shine).
*/

type BarraProgressoProps = {
  atual: number;
  alvo: number;
  /** o que a barra mede, pra leitor de tela */
  rotulo: string;
  className?: string;
};

export function BarraProgresso({ atual, alvo, rotulo, className }: BarraProgressoProps) {
  const feito = Math.min(Math.max(atual, 0), alvo);
  const pct = alvo > 0 ? (feito / alvo) * 100 : 0;

  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={alvo}
      aria-valuenow={feito}
      className={cn("bar-shine h-2 w-full overflow-hidden rounded-full bg-track", className)}
    >
      <div className="grow-in-w h-full rounded-full bg-primary shadow-glow" style={{ width: `${pct}%` }} />
    </div>
  );
}

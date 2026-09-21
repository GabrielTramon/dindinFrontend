import { staggerStyle } from "@/components/motion/stagger";
import { cn } from "@/lib/utils";

/*
  Lista de passos em sequência. O número é visual (o <ol> já numera pra
  leitores de tela), por isso fica escondido da árvore de acessibilidade.
  Os itens entram em cascata (rise-in, 60ms por item).
*/

type ListaNumeradaProps = {
  itens: string[];
  className?: string;
};

export function ListaNumerada({ itens, className }: ListaNumeradaProps) {
  return (
    <ol className={cn("space-y-4", className)}>
      {itens.map((item, i) => (
        <li key={`${i}-${item.slice(0, 24)}`} className="rise-in flex gap-4" style={staggerStyle(i)}>
          <span
            aria-hidden="true"
            className="number-glow w-6 shrink-0 font-extrabold text-primary tnum"
          >
            {i + 1}
          </span>
          <p className="min-w-0 text-base">{item}</p>
        </li>
      ))}
    </ol>
  );
}

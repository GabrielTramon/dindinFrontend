import { Palavras } from "@/components/motion/palavras";
import { staggerStyle } from "@/components/motion/stagger";
import type { Decisao as DecisaoDoPlano } from "@/domain";
import { cn } from "@/lib/utils";

/*
  O herói da página: uma frase que diz o que fazer com o dinheiro este mês.
  É a única coisa grande na tela — o resto é hierarquia tipográfica.
  Painel com luz interna (mesh-panel, ::before) e borda de luz girando
  (halo-border, ::after); em corte a luz vira warn e a malha some. O título
  entra palavra por palavra (o aria-label carrega a frase inteira). Sem
  number-glow aqui: o text-shadow seria recortado pelo overflow de cada .word.
*/

type DecisaoProps = {
  decisao: DecisaoDoPlano;
  modoCorte: boolean;
};

export function Decisao({ decisao, modoCorte }: DecisaoProps) {
  return (
    <section
      aria-labelledby="decisao-titulo"
      className={cn(
        "mesh-panel halo-border rounded-3xl p-6 sm:p-10",
        modoCorte
          ? "bg-warn-soft [--glow:var(--warn)] [--glow-soft:color-mix(in_oklch,var(--warn)_30%,transparent)] [--mesh-1:transparent] [--mesh-2:transparent]"
          : "bg-accent",
      )}
    >
      {modoCorte && <p className="eyebrow mb-3 text-warn">Plano de corte</p>}
      <h1
        id="decisao-titulo"
        aria-label={decisao.titulo}
        className="text-3xl font-extrabold tracking-tight text-foreground [--stagger-words:24ms] sm:text-5xl"
      >
        <Palavras texto={decisao.titulo} />
      </h1>
      <p className="rise-in mt-4 text-lg text-ink-2 sm:text-xl" style={staggerStyle(4)}>
        {decisao.texto}
      </p>
    </section>
  );
}

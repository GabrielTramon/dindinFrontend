import type { Decisao as DecisaoDoPlano } from "@/domain";
import { cn } from "@/lib/utils";

/*
  O herói da página: uma frase que diz o que fazer com o dinheiro este mês.
  É a única coisa grande na tela — o resto é hierarquia tipográfica.
*/

type DecisaoProps = {
  decisao: DecisaoDoPlano;
  modoCorte: boolean;
};

export function Decisao({ decisao, modoCorte }: DecisaoProps) {
  return (
    <section
      aria-labelledby="decisao-titulo"
      className={cn("rounded-2xl p-6 sm:p-8", modoCorte ? "bg-warn-soft" : "bg-accent")}
    >
      {modoCorte && (
        <p className="mb-3 text-xs font-bold tracking-wider text-warn uppercase">Plano de corte</p>
      )}
      <h1
        id="decisao-titulo"
        className="text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl"
      >
        {decisao.titulo}
      </h1>
      <p className="mt-3 text-base text-ink-2 sm:text-lg">{decisao.texto}</p>
    </section>
  );
}

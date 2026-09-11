import type { Resumo } from "@/domain";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
  Três números que resumem o mês: o que entra, o que sai, o que sobra.
  Quando falta, o terceiro vira "Falta"; sem sobra (zero ou negativo) fica
  em warn — é a única coisa ruim de verdade aqui.
*/

export function Numeros({ resumo }: { resumo: Resumo }) {
  const falta = resumo.excedente < 0;

  return (
    <section aria-labelledby="numeros-titulo">
      <h2 id="numeros-titulo" className="text-lg font-extrabold tracking-tight sm:text-xl">
        Seu mês em números
      </h2>
      <dl className="mt-4 grid grid-cols-3 gap-3 sm:gap-6">
        <Numero rotulo="Entra" valor={resumo.renda} />
        <Numero rotulo="Sai" valor={resumo.custoTotal} nota="moradia + fixos + parcelas" />
        <Numero
          rotulo={falta ? "Falta" : "Sobra"}
          valor={Math.abs(resumo.excedente)}
          alerta={resumo.excedente <= 0}
        />
      </dl>
    </section>
  );
}

type NumeroProps = {
  rotulo: string;
  valor: number;
  nota?: string;
  alerta?: boolean;
};

function Numero({ rotulo, valor, nota, alerta = false }: NumeroProps) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{rotulo}</dt>
      <dd
        className={cn(
          "mt-1 text-xl font-extrabold tracking-tight tnum sm:text-2xl",
          alerta && "text-warn",
        )}
      >
        {formatBRL(valor)}
      </dd>
      {nota && <dd className="mt-0.5 text-xs text-muted-foreground">{nota}</dd>}
    </div>
  );
}

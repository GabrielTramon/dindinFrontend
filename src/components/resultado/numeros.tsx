import { Stat } from "@/components/ui/stat";
import type { Resumo } from "@/domain";

/*
  Três números que resumem o mês: o que entra, o que sai, o que sobra.
  Quando falta, o terceiro vira "Falta"; sem sobra (zero ou negativo) fica
  em warn — é a única coisa ruim de verdade aqui. Os três contam em
  sequência (0 / 150 / 300ms); a Sobra é o número grande.
*/

export function Numeros({ resumo }: { resumo: Resumo }) {
  const falta = resumo.excedente < 0;

  return (
    <section aria-labelledby="numeros-titulo">
      <h2 id="numeros-titulo" className="text-lg font-extrabold tracking-tight sm:text-xl">
        Seu mês em números
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-6">
        <Stat label="Entra" value={resumo.renda} count />
        <Stat
          label="Sai"
          value={resumo.custoTotal}
          nota="moradia + fixos + parcelas"
          count
          delay={150}
        />
        <Stat
          label={falta ? "Falta" : "Sobra"}
          value={Math.abs(resumo.excedente)}
          tone={resumo.excedente <= 0 ? "warn" : "primary"}
          size="lg"
          count
          delay={300}
          className="col-span-2 sm:col-span-1"
        />
      </dl>
    </section>
  );
}

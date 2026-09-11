import { gerarPlano, NOME_DIVIDA, ROTULO_DEGRAU, type Perfil } from "@/domain";
import { formatBRL, formatMeses } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
  A tese da página: um plano real, gerado no servidor pelo mesmo motor que a
  pessoa vai usar. Perfil típico de quem está começando — CLT, aluguel
  dividido, um rotativo pendurado e um pouco guardado.
*/

const PERFIL_EXEMPLO: Perfil = {
  rendaMensal: 2800,
  tipoRenda: "clt",
  idade: 24,
  moradia: "dividido",
  custoMoradia: 700,
  gastosFixos: [
    { categoria: "mercado", valor: 450 },
    { categoria: "transporte_publico", valor: 200 },
    { categoria: "celular", valor: 90 },
    { categoria: "academia", valor: 120 },
    { categoria: "streaming", valor: 40 },
  ],
  dividas: [{ tipo: "rotativo", saldo: 1500 }],
  guardado: 1000,
};

export function ExemploPlano() {
  const plano = gerarPlano(PERFIL_EXEMPLO);
  const { resumo, aporte, livre, dividas } = plano;

  const total = aporte + livre;
  const pctAporte = total > 0 ? Math.round((aporte / total) * 100) : 0;

  const dividaCara = dividas.caras[0];
  const nomeDivida = dividaCara ? NOME_DIVIDA[dividaCara.tipo] : "a dívida";
  const meses = dividas.mesesParaQuitarCaras;
  const indiceDegrau = String(plano.degrau).padStart(2, "0");

  return (
    <article
      aria-label="Exemplo de plano"
      className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          Exemplo
        </span>
        <span className="text-xs text-muted-foreground">
          <span className="font-mono">{indiceDegrau}</span> {ROTULO_DEGRAU[plano.degrau]}
        </span>
      </div>

      <p className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">
        {plano.decisao.titulo}
      </p>

      <dl className="mt-6 grid grid-cols-3 gap-3">
        <Numero rotulo="Entra" valor={resumo.renda} />
        <Numero rotulo="Sai" valor={resumo.custoTotal} />
        <Numero rotulo="Sobra" valor={resumo.excedente} destaque />
      </dl>

      <div className="mt-6">
        <div aria-hidden="true" className="flex h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary" style={{ width: `${pctAporte}%` }} />
          <div className="h-full flex-1 bg-chart-3" />
        </div>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-primary" />
            <span className="tnum font-bold text-foreground">{formatBRL(aporte)}</span> pro plano
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-2.5 rounded-full bg-chart-3" />
            <span className="tnum font-bold text-foreground">{formatBRL(livre)}</span> livre pra
            você
          </span>
        </p>
      </div>

      <p className="mt-5 border-t pt-4 text-sm text-ink-2">
        {meses === null ? (
          <>Nesse ritmo, {nomeDivida} não zera — vale renegociar.</>
        ) : (
          <>
            Nesse ritmo, {nomeDivida} zera em{" "}
            <span className="font-bold text-foreground">{formatMeses(meses)}</span>.
          </>
        )}
      </p>
    </article>
  );
}

type NumeroProps = {
  rotulo: string;
  valor: number;
  destaque?: boolean;
};

function Numero({ rotulo, valor, destaque = false }: NumeroProps) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{rotulo}</dt>
      <dd className={cn("tnum mt-1 text-lg font-extrabold sm:text-xl", destaque && "text-primary")}>
        {formatBRL(valor)}
      </dd>
    </div>
  );
}

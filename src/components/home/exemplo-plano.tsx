import { gerarPlano, NOME_DIVIDA, ROTULO_DEGRAU, type Perfil } from "@/domain";
import { formatBRL, formatMeses } from "@/lib/format";
import { cn } from "@/lib/utils";
import { staggerStyle } from "@/components/motion/stagger";
import { cardClasses } from "@/components/ui/card";
import { Marcador, SegmentBar } from "@/components/ui/segment-bar";
import { Stat } from "@/components/ui/stat";

/*
  A tese da página: um plano real, gerado no servidor pelo mesmo motor que a
  pessoa vai usar. Perfil típico de quem está começando — CLT, aluguel
  dividido, um rotativo pendurado e um pouco guardado.

  O card entra um tique depois do título (rise-in-blur, --i 2), tem a borda de
  luz girando (halo-border), sombra que acende no hover (glow-card) e um brilho
  que segue o cursor (span.spotlight + SpotlightTracker do root layout). Os
  números contam (Stat count) e a barra cresce com uma luz atravessando.
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

  const dividaCara = dividas.caras[0];
  const nomeDivida = dividaCara ? NOME_DIVIDA[dividaCara.tipo] : "a dívida";
  const meses = dividas.mesesParaQuitarCaras;
  const indiceDegrau = String(plano.degrau).padStart(2, "0");

  return (
    <article
      aria-label="Exemplo de plano"
      data-spotlight
      className={cn(
        cardClasses({ halo: true }),
        // glow-card sem press precisa da própria transição: senão a sombra do hover acende seca
        "glow-card rise-in-blur p-5 transition-[border-color,box-shadow] duration-(--duration-base) ease-out-expo motion-reduce:transition-none sm:p-6",
      )}
      style={staggerStyle(2)}
    >
      <span aria-hidden="true" className="spotlight" />

      <div className="flex items-center justify-between gap-4">
        <span className="eyebrow">Exemplo</span>
        <span className="text-xs text-muted-foreground">
          <span className="tnum">{indiceDegrau}</span> {ROTULO_DEGRAU[plano.degrau]}
        </span>
      </div>

      <p className="mt-3 text-xl font-extrabold tracking-tight sm:text-2xl">
        {plano.decisao.titulo}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-x-3 gap-y-4">
        <Stat
          label="Sobra"
          value={resumo.excedente}
          tone="primary"
          size="lg"
          count
          delay={300}
          className="col-span-2"
        />
        <Stat label="Entra" value={resumo.renda} count />
        <Stat label="Sai" value={resumo.custoTotal} count delay={150} />
      </dl>

      <div className="mt-6">
        <SegmentBar
          height="md"
          enter
          label={`${formatBRL(aporte)} pro plano e ${formatBRL(livre)} livre pra você`}
          segments={[
            { value: aporte, className: "bg-primary" },
            { value: livre, className: "bg-chart-3" },
          ]}
          style={staggerStyle(4)}
        />
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <Marcador className="bg-primary" />
            <span className="tnum font-bold text-foreground">{formatBRL(aporte)}</span> pro plano
          </span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Marcador className="bg-chart-3" />
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

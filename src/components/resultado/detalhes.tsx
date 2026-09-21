import { IconeCategoria } from "@/components/categorias/icone-categoria";
import { staggerStyle } from "@/components/motion/stagger";
import { Card } from "@/components/ui/card";
import {
  ROTULO_DIVIDA,
  type ClasseDivida,
  type DividaAvaliada,
  type Folego,
  type GastoFixoDetalhado,
  type QuadroDividas,
  type Reserva,
} from "@/domain";
import { formatBRL, formatMeses, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BarraProgresso } from "./barra-progresso";

/*
  Os números por trás da decisão: fôlego, reserva e dívidas, cada um no seu
  card. Nenhum card aqui é clicável, então eles têm a sombra esmeralda que
  acende no hover (glow-card) mas não o `press` — encolher ao toque é gesto
  de botão. As barras enchem de 0 até o alvo ao entrar (grow-in-w).
*/

/** card de leitura: glow no hover com transição própria (sem press, nada aqui é botão) */
const CARD_LEITURA =
  "glow-card p-5 transition-[border-color,box-shadow] duration-(--duration-base) ease-out-expo motion-reduce:transition-none";

type DetalhesProps = {
  folego: Folego;
  reserva: Reserva;
  dividas: QuadroDividas;
  gastosFixos: GastoFixoDetalhado[];
};

export function Detalhes({ folego, reserva, dividas, gastosFixos }: DetalhesProps) {
  return (
    <section aria-labelledby="detalhes-titulo">
      <h2 id="detalhes-titulo" className="text-lg font-extrabold tracking-tight sm:text-xl">
        Em detalhe
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <CardFolego folego={folego} />
        <CardReserva reserva={reserva} />
        {gastosFixos.length > 0 && <CardGastosFixos gastos={gastosFixos} />}
        {dividas.avaliadas.length > 0 && <CardDividas dividas={dividas} />}
      </div>
    </section>
  );
}

function CardGastosFixos({ gastos }: { gastos: GastoFixoDetalhado[] }) {
  const total = gastos.reduce((acc, g) => acc + g.valor, 0);

  return (
    <Card className={cn(CARD_LEITURA, "md:col-span-2")}>
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-extrabold tracking-tight">Gastos fixos</h3>
        <p className="font-bold tnum">{formatBRL(total)}/mês</p>
      </div>
      <p className="text-xs text-muted-foreground">Do maior pro menor</p>

      <ul className="mt-3 grid gap-2">
        {gastos.map((g, i) => (
          <li key={`${g.categoria}-${i}`} className="grid gap-1.5">
            <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-3">
              <IconeCategoria icone={g.icone} className="size-4 translate-y-0.5 text-primary" />
              <p className="min-w-0 truncate text-sm font-bold">{g.nomeExibido}</p>
              <p className="text-right text-sm font-bold tnum">
                {formatBRL(g.valor)}
                <span className="ml-2 font-normal text-muted-foreground">{formatPct(g.fatia)}</span>
              </p>
            </div>
            {/* a barra é decorativa: a fatia já está escrita ao lado */}
            <div aria-hidden="true" className="ml-7 h-1.5 overflow-hidden rounded-full bg-track">
              <div
                className="grow-in-w h-full rounded-full bg-chart-2"
                style={{ width: `${Math.max(2, Math.round(g.fatia * 100))}%`, ...staggerStyle(i) }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AlvoAtual({ alvo, atual }: { alvo: number; atual: number }) {
  return (
    <dl className="mt-3 flex gap-6">
      <div>
        <dt className="eyebrow">Alvo</dt>
        <dd className="font-bold tnum">{formatBRL(alvo)}</dd>
      </div>
      <div>
        <dt className="eyebrow">Atual</dt>
        <dd className="font-bold tnum">{formatBRL(atual)}</dd>
      </div>
    </dl>
  );
}

function CardFolego({ folego }: { folego: Folego }) {
  return (
    <Card className={CARD_LEITURA}>
      <h3 className="font-extrabold tracking-tight">Fôlego mínimo</h3>
      <AlvoAtual alvo={folego.alvo} atual={folego.atual} />
      <BarraProgresso
        className="mt-3"
        atual={folego.atual}
        alvo={folego.alvo}
        rotulo="Progresso do fôlego mínimo"
      />
      <p className={cn("mt-2 text-sm", folego.ok ? "font-bold text-primary" : "text-ink-2")}>
        {folego.ok ? "Completo" : `Faltam ${formatBRL(folego.falta)}`}
      </p>
    </Card>
  );
}

function situacaoReserva(reserva: Reserva): string {
  const m = reserva.mesesParaCompletar;
  if (m === 0) return "Completa";
  if (m === null) return "Entra depois das prioridades de cima";
  return `Nesse ritmo, completa em ${formatMeses(m)}`;
}

function CardReserva({ reserva }: { reserva: Reserva }) {
  return (
    <Card className={CARD_LEITURA}>
      <h3 className="font-extrabold tracking-tight">Reserva de emergência</h3>
      <p className="text-xs text-muted-foreground">{reserva.multiplicador} meses dos seus custos</p>
      <AlvoAtual alvo={reserva.alvo} atual={reserva.atual} />
      <BarraProgresso
        className="mt-3"
        atual={reserva.atual}
        alvo={reserva.alvo}
        rotulo="Progresso da reserva de emergência"
      />
      <p className={cn("mt-2 text-sm", reserva.ok ? "font-bold text-primary" : "text-ink-2")}>
        {situacaoReserva(reserva)}
      </p>
    </Card>
  );
}

const NOME_CLASSE: Record<ClasseDivida, string> = {
  cara: "cara",
  media: "média",
  barata: "barata",
};

function LinhaDivida({ divida }: { divida: DividaAvaliada }) {
  return (
    <li className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="font-bold">{ROTULO_DIVIDA[divida.tipo]}</p>
        <p className="text-xs text-muted-foreground tnum">
          {formatPct(divida.taxaAnual)} ao ano ·{" "}
          <span className={cn(divida.classe === "cara" && "font-bold text-warn")}>
            {NOME_CLASSE[divida.classe]}
          </span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-bold tnum">{formatBRL(divida.saldo)}</p>
        <p className="text-xs text-ink-2 tnum">{formatBRL(divida.jurosMensais)}/mês só de juros</p>
      </div>
    </li>
  );
}

function CardDividas({ dividas }: { dividas: QuadroDividas }) {
  return (
    <Card className={cn(CARD_LEITURA, "md:col-span-2")}>
      <h3 className="font-extrabold tracking-tight">Dívidas</h3>
      <ul className="mt-2 divide-y">
        {dividas.avaliadas.map((d, i) => (
          <LinhaDivida key={`${d.tipo}-${i}`} divida={d} />
        ))}
      </ul>
    </Card>
  );
}

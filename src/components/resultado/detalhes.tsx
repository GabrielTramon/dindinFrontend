import type { ReactNode } from "react";
import {
  ROTULO_DIVIDA,
  type ClasseDivida,
  type DividaAvaliada,
  type Folego,
  type QuadroDividas,
  type Reserva,
} from "@/domain";
import { formatBRL, formatMeses, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BarraProgresso } from "./barra-progresso";

/*
  Os números por trás da decisão: fôlego, reserva e dívidas, cada um no seu
  card. É a única seção com cards — o resto da página é texto.
*/

type DetalhesProps = {
  folego: Folego;
  reserva: Reserva;
  dividas: QuadroDividas;
};

export function Detalhes({ folego, reserva, dividas }: DetalhesProps) {
  return (
    <section aria-labelledby="detalhes-titulo">
      <h2 id="detalhes-titulo" className="text-lg font-extrabold tracking-tight sm:text-xl">
        Em detalhe
      </h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <CardFolego folego={folego} />
        <CardReserva reserva={reserva} />
        {dividas.avaliadas.length > 0 && <CardDividas dividas={dividas} />}
      </div>
    </section>
  );
}

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border bg-card p-5", className)}>{children}</div>;
}

function AlvoAtual({ alvo, atual }: { alvo: number; atual: number }) {
  return (
    <dl className="mt-3 flex gap-6">
      <div>
        <dt className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Alvo</dt>
        <dd className="font-bold tnum">{formatBRL(alvo)}</dd>
      </div>
      <div>
        <dt className="text-xs font-bold tracking-wider text-muted-foreground uppercase">Atual</dt>
        <dd className="font-bold tnum">{formatBRL(atual)}</dd>
      </div>
    </dl>
  );
}

function CardFolego({ folego }: { folego: Folego }) {
  return (
    <Card>
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
    <Card>
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
    <Card className="md:col-span-2">
      <h3 className="font-extrabold tracking-tight">Dívidas</h3>
      <ul className="mt-2 divide-y divide-border">
        {dividas.avaliadas.map((d, i) => (
          <LinhaDivida key={`${d.tipo}-${i}`} divida={d} />
        ))}
      </ul>
    </Card>
  );
}

"use client";

import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { IconeCategoria } from "@/components/categorias/icone-categoria";
import { CheckDraw } from "@/components/ui/drawn-icon";
import {
  cabeMaisNaMeta,
  repartirEmReaisInteiros,
  ROTULO_DEGRAU,
  ROTULO_DIVIDA,
  rotuloMeta,
  type ClasseDivida,
  type Degrau,
  type DividaAvaliada,
  type Grupo,
  type Meta,
  type MetaNoCaminho,
  type Plano,
  type Resposta,
} from "@/domain";
import { textos } from "@/domain/textos";
import { formatBRL, formatMeses, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BarraProgresso } from "./barra-progresso";
import { ListaNumerada } from "./lista-numerada";

/*
  "Ver detalhes do plano": UM <details> recolhido que guarda tudo o que o plano
  sabe e não precisa estar na dobra. Nada do plano some do produto — só sai da
  frente. Por dentro são seções planas (h3 eyebrow + conteúdo, separadas por
  hairline), sem card, sem sombra.

  Quem está fora abre numa seção com `abrirDetalhes("dividas")`: o details abre,
  a página rola até a seção e o foco vai pro h3 dela (tabIndex -1).
*/

export type SecaoDetalhe =
  | "porque"
  | "numeros"
  | "destino"
  | "ordem"
  | "reserva"
  | "dividas"
  | "gastos"
  | "meta"
  | "passos"
  | "corte"
  | "ritmos"
  | "aviso";

const ID_DETALHES = "detalhes-plano";
const idSecao = (s: SecaoDetalhe) => `detalhe-${s}`;

/** Abre os detalhes e leva a pessoa (e o foco) até a seção pedida. */
export function abrirDetalhes(secao: SecaoDetalhe) {
  const details = document.getElementById(ID_DETALHES);
  if (!(details instanceof HTMLDetailsElement)) return;
  details.open = true;
  // um quadro depois: o conteúdo do details já está no layout
  requestAnimationFrame(() => {
    const alvo = document.getElementById(idSecao(secao));
    if (!alvo) return;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    alvo.scrollIntoView({ behavior: reduzido ? "auto" : "smooth", block: "start" });
    alvo.focus({ preventScroll: true });
  });
}

export interface DetalhesPlanoProps {
  plano: Plano;
  resposta: Resposta;
  /** a lista inteira de potes, com o Guardar */
  grupos: Grupo[];
  /**
   * a meta como o caminho a projetou (`caminhoDoPlano(...).meta`): "Sua meta"
   * e "Seu caminho" mostram o MESMO prazo. No degrau 4 é a projeção do cartão.
   */
  metaNoCaminho: MetaNoCaminho | null;
}

export function DetalhesPlano({ plano, resposta, grupos, metaNoCaminho }: DetalhesPlanoProps) {
  const meta = plano.perfil.meta;
  const temDividas = plano.dividas.avaliadas.length > 0;

  return (
    <details id={ID_DETALHES} className="details-anim group border-y">
      <summary className="press -mx-2 flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-2 font-bold outline-none hover:text-primary focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
        Ver detalhes do plano
        <ChevronDown
          aria-hidden="true"
          className="size-5 shrink-0 text-muted-foreground transition-[rotate] duration-(--duration-enter) ease-spring group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>

      <div className="enter-up pb-4">
        <Secao id="porque" titulo="Por que esse passo">
          <p className="font-bold">{plano.decisao.titulo}</p>
          <p className="mt-1 text-ink-2">{plano.decisao.texto}</p>
        </Secao>

        <Secao id="numeros" titulo="Seu mês em números">
          <dl className="grid grid-cols-3 gap-3">
            <Numero rotulo="Entra" valor={plano.resumo.renda + plano.resumo.beneficios} />
            <Numero rotulo="Sai" valor={plano.resumo.custoTotal} />
            <Numero
              rotulo={plano.resumo.excedente < 0 ? "Falta" : "Sobra"}
              valor={Math.abs(plano.resumo.excedente)}
              destaque={plano.resumo.excedente > 0 ? "primary" : "warn"}
            />
          </dl>
          {plano.resumo.beneficios > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">{textos.vales.notaEntra(plano.resumo.beneficios)}</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Sai = moradia + fixos + parcelas</p>
          {plano.beneficios.semUso >= 1 && (
            <p className="mt-3 text-sm text-ink-2">{textos.vales.semUso(plano.beneficios.semUso)}</p>
          )}
        </Secao>

        {resposta.modo === "plano" && plano.alocacoes.length > 0 && (
          <Secao id="destino" titulo="Pra onde vai o que você separa">
            <Alocacoes plano={plano} total={resposta.valorMes} />
          </Secao>
        )}

        <Secao id="ordem" titulo="A ordem do plano">
          <OrdemDoPlano degrau={plano.degrau} modoCorte={plano.modoCorte} />
        </Secao>

        <Secao id="reserva" titulo="Fôlego e reserva">
          <div className="space-y-5">
            <Progresso
              nome="Fôlego mínimo"
              atual={plano.folego.atual}
              alvo={plano.folego.alvo}
              situacao={plano.folego.ok ? "Completo" : `Faltam ${formatBRL(plano.folego.falta)}`}
              ok={plano.folego.ok}
            />
            <Progresso
              nome={`Reserva de emergência · ${plano.reserva.multiplicador} meses dos seus custos`}
              atual={plano.reserva.atual}
              alvo={plano.reserva.alvo}
              situacao={situacaoReserva(plano)}
              ok={plano.reserva.ok}
            />
          </div>
        </Secao>

        {temDividas && (
          <Secao id="dividas" titulo="Dívidas">
            <Dividas plano={plano} resposta={resposta} />
          </Secao>
        )}

        {plano.gastosFixos.length > 0 && (
          <Secao id="gastos" titulo="Gastos fixos">
            <GastosFixos plano={plano} />
          </Secao>
        )}

        {meta && !plano.modoCorte && metaNoCaminho && (
          <Secao id="meta" titulo="Sua meta">
            <MetaDetalhe meta={meta} plano={plano} grupos={grupos} metaNoCaminho={metaNoCaminho} />
          </Secao>
        )}

        {plano.proximosPassos.length > 0 && (
          <Secao id="passos" titulo="Próximos passos">
            <ListaNumerada itens={plano.proximosPassos} />
          </Secao>
        )}

        {plano.corte && (
          <Secao id="corte" titulo="Mais ideias de corte">
            {plano.corte.sugestoes.length > 2 && (
              <ListaNumerada itens={plano.corte.sugestoes.slice(2)} className="mb-4" />
            )}
            <p className="text-ink-2">{plano.corte.metaTexto}</p>
          </Secao>
        )}

        {!plano.modoCorte && (
          <Secao id="ritmos" titulo="Sobre os ritmos">
            <ul className="space-y-1.5">
              <li>
                <span className="font-bold">Leve</span>
                <span className="text-ink-2"> · passo curto, mês mais folgado</span>
              </li>
              <li>
                <span className="font-bold">Equilibrado</span>
                <span className="text-ink-2"> · guarda bem sem apertar o mês (sugerido)</span>
              </li>
              <li>
                <span className="font-bold">Acelerado</span>
                <span className="text-ink-2"> · passo maior, mês mais justo</span>
              </li>
            </ul>
            <p className="mt-3 text-sm text-ink-2">{textos.sobreOsRitmos}</p>
          </Secao>
        )}

        <Secao id="aviso" titulo="Aviso completo">
          <p className="text-sm leading-relaxed text-ink-2">
            Este plano é conteúdo educacional sobre organização financeira, gerado a partir das suas
            respostas. O dindin não recomenda produtos, bancos, corretoras ou investimentos
            específicos e não substitui um profissional. Nos termos da Resolução CVM 19, não
            constitui consultoria de valores mobiliários.
          </p>
        </Secao>
      </div>
    </details>
  );
}

function Secao({ id, titulo, children }: { id: SecaoDetalhe; titulo: string; children: ReactNode }) {
  const tituloId = idSecao(id);
  return (
    <section aria-labelledby={tituloId} className="border-t py-6 first:border-t-0 first:pt-2">
      <h3
        id={tituloId}
        tabIndex={-1}
        className="eyebrow mb-3 scroll-mt-24 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {titulo}
      </h3>
      {children}
    </section>
  );
}

function Numero({ rotulo, valor, destaque }: { rotulo: string; valor: number; destaque?: "primary" | "warn" }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-ink-2">{rotulo}</dt>
      <dd
        className={cn(
          "text-lg font-extrabold tracking-tight tnum",
          destaque === "primary" && "text-primary",
          destaque === "warn" && "text-warn",
        )}
      >
        {formatBRL(valor)}
      </dd>
    </div>
  );
}

function Alocacoes({ plano, total }: { plano: Plano; total: number }) {
  // reais inteiros que fecham a soma: R$ 662 + R$ 661 = R$ 1.323
  const valores = repartirEmReaisInteiros(
    plano.alocacoes.map((a) => a.valor),
    total,
  );
  return (
    <ul className="space-y-3">
      {plano.alocacoes.map((a, i) => (
        <li key={a.destino} className="grid grid-cols-[5rem_1fr] gap-3">
          <span className="font-extrabold text-primary tnum">{formatBRL(valores[i] ?? a.valor)}</span>
          <div className="min-w-0">
            <p className="font-bold">{a.titulo}</p>
            <p className="text-sm text-ink-2">{a.descricao}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

const DEGRAUS: Degrau[] = [0, 1, 2, 3, 4];

function OrdemDoPlano({ degrau, modoCorte }: { degrau: Degrau; modoCorte: boolean }) {
  return (
    <ol className="space-y-2">
      {DEGRAUS.map((d) => {
        const feito = !modoCorte && d < degrau;
        const atual = !modoCorte && d === degrau;
        return (
          <li
            key={d}
            aria-current={atual ? "step" : undefined}
            className={cn("flex items-center gap-3", atual ? "font-bold text-foreground" : "text-ink-2")}
          >
            <span aria-hidden="true" className="flex size-4 items-center justify-center">
              {feito ? (
                <CheckDraw className="size-4 text-primary" delay={d * 110} />
              ) : (
                <span
                  className={cn(
                    "size-2 rounded-full",
                    atual ? "bg-primary ring-4 ring-primary/20" : "border border-ink-3",
                  )}
                />
              )}
            </span>
            {feito && <span className="sr-only">Resolvido:</span>}
            <span className="w-5 text-xs text-muted-foreground tnum">0{d}</span>
            <span>{ROTULO_DEGRAU[d]}</span>
          </li>
        );
      })}
    </ol>
  );
}

function situacaoReserva(plano: Plano): string {
  const m = plano.reserva.mesesParaCompletar;
  if (plano.reserva.ok || m === 0) return "Completa";
  if (m === null) return "Entra depois das prioridades de cima";
  return `Nesse ritmo, completa em ${formatMeses(m)}`;
}

function Progresso({
  nome,
  atual,
  alvo,
  situacao,
  ok,
}: {
  nome: string;
  atual: number;
  alvo: number;
  situacao: string;
  ok: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 text-sm font-bold">{nome}</p>
        <p className="shrink-0 text-sm text-ink-2 tnum">
          {formatBRL(atual)} de {formatBRL(alvo)}
        </p>
      </div>
      <BarraProgresso className="mt-2" atual={atual} alvo={alvo} rotulo={`Progresso: ${nome}`} />
      <p className={cn("mt-1.5 text-sm", ok ? "font-bold text-primary" : "text-ink-2")}>{situacao}</p>
    </div>
  );
}

const NOME_CLASSE: Record<ClasseDivida, string> = { cara: "cara", media: "média", barata: "barata" };

function Dividas({ plano, resposta }: { plano: Plano; resposta: Resposta }) {
  const { dividas } = plano;
  const semPrazo =
    resposta.modo === "plano" && plano.degrau === 1 && resposta.tempo.tipo === "sem-prazo" ? resposta.tempo : null;
  // renegociar só entra quando nenhum ritmo resolve: senão contradiz o "Usar o Acelerado"
  const renegociar = semPrazo?.verDetalhes ? dividas.caras : [];

  return (
    <>
      <ul className="divide-y">
        {dividas.avaliadas.map((d, i) => (
          <LinhaDivida key={`${d.tipo}-${i}`} divida={d} />
        ))}
      </ul>
      {/* a frase do "sem prazo" já está em Próximos passos (é o mesmo texto do motor): aqui ficaria repetida */}
      {renegociar.map((d, i) => (
        <p key={`${d.tipo}-${i}`} className="mt-3 text-sm text-ink-2">
          {textos.corte.renegociar(d)}
        </p>
      ))}
    </>
  );
}

function LinhaDivida({ divida }: { divida: DividaAvaliada }) {
  return (
    <li className="flex items-start justify-between gap-4 py-3 first:pt-0">
      <div className="min-w-0">
        <p className="font-bold">{ROTULO_DIVIDA[divida.tipo]}</p>
        <p className="text-sm text-ink-2 tnum">
          {formatPct(divida.taxaAnual)} ao ano ·{" "}
          <span className={cn(divida.classe === "cara" && "font-bold text-warn")}>{NOME_CLASSE[divida.classe]}</span>
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-bold tnum">{formatBRL(divida.saldo)}</p>
        <p className="text-sm text-ink-2 tnum">{formatBRL(divida.jurosMensais)}/mês de juros</p>
      </div>
    </li>
  );
}

function GastosFixos({ plano }: { plano: Plano }) {
  return (
    <>
      <p className="mb-3 text-sm text-ink-2 tnum">
        {formatBRL(plano.resumo.custoFixo)} por mês, do maior pro menor
      </p>
      <ul className="space-y-2.5">
        {plano.gastosFixos.map((g, i) => (
          <li key={`${g.categoria}-${i}`} className="grid gap-1.5">
            <div className="grid grid-cols-[auto_1fr_auto] items-baseline gap-3">
              <IconeCategoria icone={g.icone} className="size-4 translate-y-0.5 text-ink-3" />
              <p className="min-w-0 truncate text-sm font-bold">{g.nomeExibido}</p>
              <p className="text-right text-sm font-bold tnum">
                {formatBRL(g.valor)}
                <span className="ml-2 font-normal text-muted-foreground">{formatPct(g.fatia)}</span>
              </p>
            </div>
            {/* decorativa: a fatia já está escrita ao lado */}
            <div aria-hidden="true" className="ml-7 h-1 overflow-hidden rounded-full bg-track">
              <div
                className="h-full rounded-full bg-chart-2"
                style={{ width: `${Math.max(2, Math.round(g.fatia * 100))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function MetaDetalhe({
  meta,
  plano,
  grupos,
  metaNoCaminho,
}: {
  meta: Meta;
  plano: Plano;
  grupos: Grupo[];
  metaNoCaminho: MetaNoCaminho;
}) {
  const nome = rotuloMeta(meta);
  const degrauDeMetas = plano.degrau === 4;
  // a MESMA projeção do marco da meta em "Seu caminho" (e, no degrau 4, a do cartão)
  const { projecao, inicio, aporteDoPlano } = metaNoCaminho;

  // antes do degrau 4 o Guardar não entra como pote (o dinheiro dele ainda vai
  // pra dívida ou reserva): ele chega como "o que o plano guarda", no início da meta
  const marcados = grupos
    .filter((g) => g.contaParaMeta && (degrauDeMetas || !g.doSistema))
    .map((g) => g.nome.trim() || "um pote sem nome");
  const planoEntra = aporteDoPlano > 0;
  const prazo = projecao.meses;
  const mostraRendimento = prazo !== null && projecao.semRendimento !== prazo;

  if (projecao.valorAlvo <= 0) {
    return (
      <p className="text-ink-2">
        <span className="font-bold text-foreground">{nome}</span>: falta dizer quanto custa. Com o valor, dá pra
        calcular o tempo até lá.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p>
        <span className="font-bold">{nome}</span>
        <span className="text-ink-2 tnum"> · {formatBRL(projecao.valorAlvo)}</span>
      </p>
      {projecao.jaGuardado > 0 && (
        <p className="text-sm text-ink-2 tnum">{textos.metaDetalhe.jaGuardado(projecao.jaGuardado, projecao.valorAlvo)}</p>
      )}
      {prazo === 0 ? (
        <p className="text-sm text-ink-2">{textos.metaDetalhe.garantida}</p>
      ) : projecao.aporteMensal <= 0 && prazo === null ? (
        <p className="text-sm text-ink-2">
          Nenhum pote está entrando nesta meta ainda. Nas opções de um pote, ligue “Entra na meta {nome}” e o tempo
          até lá aparece aqui.
        </p>
      ) : prazo === null ? (
        <p className="text-sm text-ink-2 tnum">
          {textos.metaNaoFecha(projecao.aporteMensal, null, cabeMaisNaMeta(plano, projecao.aporteMensal))}
        </p>
      ) : (
        <p className="text-sm text-ink-2">
          Chega em <span className="font-bold text-foreground tnum">{formatMeses(prazo)}</span>
          {projecao.mesEstimado ? `, por volta de ${projecao.mesEstimado}` : ""}
          {textos.metaDetalhe.comoChega({
            degrauDeMetas,
            aporteMensal: projecao.aporteMensal,
            inicio,
            temPotes: marcados.length > 0,
            decimo: metaNoCaminho.decimoPorAno,
          })}
        </p>
      )}
      {mostraRendimento && (
        <p className="text-sm text-ink-2">
          {projecao.semRendimento === null
            ? `Com o rendimento que você informou, ${formatMeses(prazo)}; sem ele, essa conta não fecharia.`
            : `Com o rendimento que você informou, ${formatMeses(prazo)}; sem ele, ${formatMeses(projecao.semRendimento)}.`}
        </p>
      )}
      {prazo !== 0 && (projecao.aporteMensal > 0 || projecao.jaGuardado > 0) && (
        <p className="text-sm text-ink-2">
          {textos.metaDetalhe.entraNaConta(
            marcados,
            planoEntra,
            !degrauDeMetas,
            projecao.jaGuardado > 0,
            (metaNoCaminho.decimoPorAno ?? 0) > 0,
          )}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Estimativa feita com os números que você informou. Rendimento não é garantido e o prazo muda se os valores
        mudarem.
      </p>
    </div>
  );
}

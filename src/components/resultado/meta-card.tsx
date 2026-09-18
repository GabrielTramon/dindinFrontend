"use client";

import { IconeCategoria } from "@/components/categorias/icone-categoria";
import { metaPorTipo, rotuloMeta, type Grupo, type Meta, type ProjecaoMeta } from "@/domain";
import { formatBRL, formatMeses } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
  O cartão da meta: quanto entra por mês, em quanto tempo chega e de onde vem
  esse dinheiro.

  A conta é a `projetarMeta` do domínio — aqui só se escreve o resultado. O
  saldo começa do zero por decisão de produto: o que já está guardado continua
  sendo reserva de emergência, não entrada da meta.

  Nada aqui promete rendimento. O número de juros é o que a pessoa digitou no
  grupo, e a ressalva no fim diz isso com todas as letras.
*/

/** "Investimento, Namoro e Emergência" — lista em pt-BR, sem vírgula antes do "e". */
function listar(nomes: string[]): string {
  if (nomes.length === 0) return "";
  if (nomes.length === 1) return nomes[0];
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}

export interface MetaCardProps {
  meta: Meta;
  /** o resultado de `projetarMeta(meta, grupos, aporteDoPlanoQueConta, hoje)` */
  projecao: ProjecaoMeta;
  /**
   * true quando a cascata já chegou no degrau de metas — é o que faz o dinheiro
   * do plano contar aqui. Enquanto a pessoa paga cartão, esse dinheiro não virou
   * meta nenhuma, e o cartão não pode dizer que virou.
   */
  degrauDeMetas: boolean;
  /** opcional: com a lista, o cartão nomeia os grupos marcados em vez de só citá-los */
  grupos?: Grupo[];
  className?: string;
}

export function MetaCard({ meta, projecao, degrauDeMetas, grupos, className }: MetaCardProps) {
  const catalogo = metaPorTipo(meta.tipo);
  const nome = rotuloMeta(meta);

  const marcados = (grupos ?? []).filter((g) => g.contaParaMeta);
  const nomesMarcados = marcados.map((g) => g.nome.trim() || "um grupo sem nome");

  const semAlvo = projecao.valorAlvo <= 0;
  const semFonte = projecao.aporteMensal <= 0;

  /*
    O efeito do rendimento é a diferença entre os dois prazos. Quando são
    iguais, não há o que mostrar: uma linha dizendo "com ou sem rendimento, o
    mesmo prazo" só ocuparia espaço.
  */
  const prazo = projecao.meses;
  const mostraRendimento = prazo !== null && projecao.semRendimento !== prazo;

  return (
    <section
      aria-labelledby="meta-titulo"
      className={cn("min-w-0 rounded-2xl border border-border bg-card p-5", className)}
    >
      <div className="flex min-w-0 items-center gap-3">
        <IconeCategoria icone={catalogo.icone} className="size-6 text-primary" />
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Sua meta
          </p>
          <h2 id="meta-titulo" className="min-w-0 font-extrabold tracking-tight wrap-break-word">
            {nome}
            {!semAlvo && (
              <span className="font-bold text-ink-2 tnum"> · {formatBRL(projecao.valorAlvo)}</span>
            )}
          </h2>
        </div>
      </div>

      {semAlvo ? (
        <p className="mt-4 text-ink-2">
          Falta dizer quanto custa essa meta. Com o valor, dá pra calcular o tempo até lá.
        </p>
      ) : semFonte ? (
        /* estado vazio: ensina o próximo passo, sem tom de erro — não ter marcado
           grupo nenhum é o estado normal de quem acabou de abrir a tela */
        <p className="mt-4 text-ink-2">
          Nenhum grupo está entrando nesta meta ainda. Marque um grupo ali em cima como{" "}
          <span className="font-bold text-foreground">entra na minha meta</span> e o tempo até{" "}
          {nome} aparece aqui.
        </p>
      ) : (
        <>
          <dl className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Entra por mês
              </dt>
              <dd className="text-xl font-extrabold text-primary tnum">
                {formatBRL(projecao.aporteMensal)}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                Tempo até lá
              </dt>
              <dd className="text-xl font-extrabold tnum">
                {prazo === null ? "Não fecha assim" : formatMeses(prazo)}
              </dd>
              {prazo !== null && projecao.mesEstimado && (
                <dd className="text-sm text-ink-2">por volta de {projecao.mesEstimado}</dd>
              )}
            </div>
          </dl>

          {prazo === null && (
            /* nunca chegar não é motivo pra esconder o número: é motivo pra dizer
               o que muda — e o que muda é o valor mensal, não um rendimento melhor */
            <p className="mt-3 text-ink-2">
              Com <span className="tnum">{formatBRL(projecao.aporteMensal)}</span> por mês, esta
              meta não fecha nem em 50 anos. O que muda esse número é aumentar o valor mensal ou
              rever quanto a meta precisa custar.
            </p>
          )}

          {mostraRendimento && (
            <p className="mt-3 text-ink-2">
              {projecao.semRendimento === null
                ? `Com o rendimento que você informou, ${formatMeses(prazo)}; sem ele, essa conta não fecharia.`
                : `Com o rendimento que você informou, ${formatMeses(prazo)}; sem ele, ${formatMeses(projecao.semRendimento)}.`}
            </p>
          )}

          <p className="mt-3 text-sm text-ink-2">
            Entra nesta conta:{" "}
            {nomesMarcados.length > 0 ? listar(nomesMarcados) : "os grupos que você marcou"}
            {degrauDeMetas
              ? ", mais o que o plano guarda — ele conta aqui porque suas prioridades de cima já estão resolvidas."
              : "."}
          </p>
        </>
      )}

      <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
        Estimativa feita com os números que você informou. Rendimento não é garantido e o prazo
        muda se os valores mudarem.
      </p>
    </section>
  );
}

"use client";

import { Plus } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ctaClasses } from "@/components/layout/cta-link";
import { ITEM } from "@/components/motion/springs";
import { SegmentBar } from "@/components/ui/segment-bar";
import { useToast } from "@/components/ui/toast";
import {
  gruposSugeridosPara,
  pctDe,
  pctDoGuardar,
  podeAdicionarGrupo,
  repartirEmReaisInteiros,
  respostaDoPlano,
  RITMO_PADRAO,
  rotuloMeta,
  textosDivisor,
  valorDePctNoTeto,
  type Grupo,
  type GrupoSugerido,
  type Perfil,
  type Plano,
} from "@/domain";
import { arredondar, formatBRL, formatPct } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DrawerNovoPote } from "./drawer-novo-pote";
import { DrawerOpcoesPote, type AlocacaoDoGuardar } from "./drawer-opcoes-pote";
import {
  COR_PRA_VOCE,
  corDoPote,
  ID_NOVO_POTE,
  idMaisPote,
  idPctPote,
  itensPassamDe,
  livreQueConta,
  nomeDoPote,
  novoId,
  poteComValor,
  tetoEmReais,
  valorDoPoteNovo,
} from "./pote-comum";
import { LinhaPraVoce, PoteLinha } from "./pote-linha";
import type { UsoDaOrganizacao } from "./usar-organizacao";
import type { usarEscolhaDeRitmo } from "./usar-ritmo";

/*
  "Divida o que sobra": o que sobra no mês é 100% e a pessoa reparte em potes.

  - Guardar (do sistema, não sai): mexer na % grava `escolherAporte(R$)`; cair
    exatamente na % de um ritmo grava o ritmo e apaga a escolha manual.
  - Potes da pessoa (até 5): gravados em R$ com `baseReferencia`, então a % se
    mantém quando o salário muda.
  - Pra você: não é pote gravado. É o que os potes deixam, SEM mínimo: a
    pessoa pode pôr 100% nos potes. O único limite é a sobra inteira — cada [+]
    para no teto do pote (valor atual + o que ainda está no "Pra você"). Menos
    de R$ 1 no "Pra você" é resíduo de centavos e vale 0; o teto do "Guardar"
    é em reais inteiros, como o aporte do motor.
  - Cada pote mostra quanto rende ao mês, com o lápis pra editar ali mesmo.

  Dado antigo que passa da sobra (a sobra diminuiu) ganha a faixa com "Ajustar
  proporcionalmente", que reparte a sobra na proporção dos potes.

  Foco: criar, remover e as gavetas mexem na lista embaixo do foco. O id em
  `focoPendente` recebe o foco quando a lista mudou e nenhuma gaveta está no
  caminho (a gaveta que fecha deixa o resto da página inerte até terminar).
*/

type EscolhaDeRitmo = ReturnType<typeof usarEscolhaDeRitmo>;

export interface DivisorProps {
  plano: Plano;
  perfil: Perfil;
  uso: UsoDaOrganizacao;
  ritmo: EscolhaDeRitmo;
}

const centavos = (v: number) => Math.round(arredondar(v) * 100);

/** "Pote Namoro removido." — sem nome, "Pote sem nome removido." */
function nomeNoAviso(grupo: Grupo): string {
  return grupo.nome.trim() || "sem nome";
}

export function Divisor({ plano, perfil, uso, ritmo }: DivisorProps) {
  const toast = useToast();
  const [criando, setCriando] = useState(false);
  // a gaveta de novo pote continua montada até terminar de fechar
  const [novoMontado, setNovoMontado] = useState(false);
  const [opcoes, setOpcoes] = useState<{ id: string; focarNome: boolean } | null>(null);
  const [opcoesAberto, setOpcoesAberto] = useState(false);
  const [anuncio, setAnuncio] = useState("");

  // o foco que a próxima mudança de lista (ou o fim de uma gaveta) entrega
  const focoPendente = useRef<string | null>(null);
  // "Outro": quando a gaveta de novo pote terminar de fechar, abre a de opções deste pote
  const abrirOpcoesDepois = useRef<string | null>(null);
  // o Desfazer roda depois de outras gravações: precisa da lista de AGORA
  const usoRef = useRef(uso);
  useEffect(() => {
    usoRef.current = uso;
  });

  const { grupos, limites, base } = uso;
  const assinatura = grupos.map((g) => g.id).join("|");

  const executarFoco = useCallback(() => {
    const id = focoPendente.current;
    if (id === null) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.focus();
    // durante o fechamento da gaveta o resto da página ainda está inerte: tenta de novo no fim
    if (document.activeElement === el) focoPendente.current = null;
  }, []);

  // com gaveta montada quem entrega o foco é o finalFocus dela (a página ainda está inerte)
  const semGaveta = !novoMontado && opcoes === null;
  useEffect(() => {
    if (semGaveta) executarFoco();
  }, [assinatura, semGaveta, executarFoco]);

  /** o finalFocus das gavetas: o foco pendente (pote novo, pote de cima) ou o padrão (quem abriu) */
  const focoAoFechar = useCallback((): HTMLElement | boolean => {
    const id = focoPendente.current;
    const el = id === null ? null : document.getElementById(id);
    if (!el) return true;
    focoPendente.current = null;
    return el;
  }, []);

  const esteMes = useMemo(() => {
    const r = respostaDoPlano(plano, { simulacoes: [], hoje: new Date() });
    return r.modo === "plano" ? r.esteMes : null;
  }, [plano]);

  const alocacoes = useMemo<AlocacaoDoGuardar[]>(() => {
    const valores = plano.alocacoes.map((a) => a.valor);
    const inteiros = repartirEmReaisInteiros(valores, Math.round(valores.reduce((a, b) => a + b, 0)));
    return plano.alocacoes.map((a, i) => ({ titulo: a.titulo, reais: inteiros[i] }));
  }, [plano.alocacoes]);

  // modo corte: não há o que dividir (a tela mostra a linha do corte no lugar)
  if (plano.modoCorte || !(base > 0)) return null;

  const soma = grupos.reduce((acc, g) => acc + g.valor, 0);
  // menos de R$ 1 no "Pra você" é resíduo de centavos (sobra de R$ 1.000,55 com o "Guardar" em
  // R$ 1.000): vale 0 — senão o [+] nunca trava e o "Pra você" diria "0% · R$ 1/mês"
  const livre = livreQueConta(limites.livre);
  // reais inteiros que fecham a sobra (R$ 662 + R$ 661 = R$ 1.323); dado que passa da sobra fica como está
  const reais =
    centavos(soma) > centavos(base)
      ? [...grupos.map((g) => Math.round(g.valor)), 0]
      : livre > 0
        ? repartirEmReaisInteiros([...grupos.map((g) => g.valor), livre], base)
        : [...repartirEmReaisInteiros(grupos.map((g) => g.valor), soma), 0];
  // a % do Guardar é a do cartão do topo (pctDoGuardar): resíduo de centavos de fora conta como 100%
  const pctDoPote = (g: Grupo, valor: number = g.valor) => (g.doSistema ? pctDoGuardar(valor, base) : pctDe(valor, base));
  const pcts = grupos.map((g) => pctDoPote(g));
  const pctLivre = livre > 0 ? Math.max(0, 100 - pcts.reduce((a, b) => a + b, 0)) : 0;
  const cheio = !podeAdicionarGrupo(grupos);
  const nomeMeta = perfil.meta ? rotuloMeta(perfil.meta) : null;
  const degrauDeMetas = plano.degrau === 4;

  /**
   * O máximo do pote agora: o valor dele + o que está no "Pra você". O do
   * "Guardar" é em reais inteiros, pra baixo — o motor guarda o aporte sem
   * centavos, então um teto com centavos seria um [+] que nunca chega.
   */
  const tetoDe = (g: Grupo): number => {
    const teto = arredondar(g.valor + livre);
    return g.doSistema ? tetoEmReais(teto) : teto;
  };

  const sugestoes = gruposSugeridosPara(perfil.tipoRenda).filter((s) => s.slug !== "eu_mesmo");
  const nomesUsados = new Set(grupos.map((g) => g.nome.trim().toLowerCase()));
  // o pote novo nasce com 10% da sobra, sem passar do que está no "Pra você"
  const valorInicial = valorDoPoteNovo(limites.livre, base);
  const pctInicial = pctDe(valorInicial, base);

  const ritmoAtual = perfil.ritmo ?? RITMO_PADRAO;
  const simAtual = ritmo.simulacoes.find((s) => s.ritmo === ritmoAtual);
  const grupoAberto = opcoes ? (grupos.find((g) => g.id === opcoes.id) ?? null) : null;

  function anunciar(grupo: Grupo, pct: number, valor: number) {
    const livreNovo = livreQueConta(Math.max(0, arredondar(base - (soma - grupo.valor + valor))));
    const partes = [
      `${nomeDoPote(grupo)}: ${pct}%, ${formatBRL(valor)} por mês.`,
      `Pra você: ${pctDe(livreNovo, base)}%, ${formatBRL(livreNovo)}.`,
    ];
    if (livreNovo <= 0) partes.push(textosDivisor.anuncioTudoDividido);
    setAnuncio(partes.join(" "));
  }

  function definirPct(grupo: Grupo, pct: number) {
    const max = tetoDe(grupo);
    // o "Guardar" grava reais inteiros: é o que o motor guarda (e o teto dele já é inteiro)
    const valor = grupo.doSistema
      ? Math.min(Math.round(valorDePctNoTeto(pct, base, max)), max)
      : valorDePctNoTeto(pct, base, max);
    aplicarValor(grupo, valor, (s) => s.pct === pct);
  }

  /** O valor exato em R$ que ela digitou: sem passar pela %, então 2.500 fica 2.500. */
  function definirReais(grupo: Grupo, digitado: number) {
    const max = tetoDe(grupo);
    const valor = Math.min(Math.max(0, Math.round(digitado)), Math.floor(max));
    // um valor igual ao de um ritmo é escolher o ritmo
    aplicarValor(grupo, valor, (s) => centavos(s.plano.aporte) === centavos(valor));
  }

  function aplicarValor(grupo: Grupo, valor: number, ehDoRitmo: (s: (typeof ritmo.simulacoes)[number]) => boolean) {
    const max = tetoDe(grupo);
    const pct = pctDoPote(grupo, valor);
    if (centavos(valor) === centavos(grupo.valor)) return;

    if (grupo.doSistema) {
      // cair exatamente num ritmo é escolher o ritmo, sem virar "à mão"
      const doRitmo = ritmo.simulacoes.find(
        (s) => ehDoRitmo(s) && s.plano.aporte <= max + 0.005 && s.plano.resumo.excedente === base,
      );
      // o ritmo já encolhe os itens do "Guardar" que não cabem no aporte dele
      if (doRitmo) ritmo.escolher(doRitmo.ritmo);
      else {
        uso.escolherAporte(valor);
        // itens do "Guardar" que não cabem mais encolhem junto
        if (itensPassamDe(grupo, valor)) {
          uso.salvarGrupos(grupos.map((g) => (g.id === grupo.id ? poteComValor(g, valor) : g)));
        }
      }
    } else {
      uso.salvarGrupos(grupos.map((g) => (g.id === grupo.id ? poteComValor(g, valor) : g)));
    }
    anunciar(grupo, pct, valor);
  }

  function trocar(id: string, patch: Partial<Grupo>) {
    uso.salvarGrupos(
      grupos.map((g) => {
        if (g.id !== id) return g;
        const novo: Grupo = { ...g, ...patch };
        // chave ausente, nunca `undefined`: é o que desliga o rendimento de verdade
        if ("rendimentoMensal" in patch && patch.rendimentoMensal === undefined) delete novo.rendimentoMensal;
        return novo;
      }),
    );
  }

  function criar(sugestao: GrupoSugerido) {
    if (!podeAdicionarGrupo(grupos)) return;
    const id = novoId();
    const valor = valorInicial;
    const outro = sugestao.slug === "outro";
    uso.salvarGrupos([
      ...grupos,
      {
        id,
        // "Outro" nasce sem nome de propósito: o foco cai no campo e a pessoa escreve o dela
        nome: outro ? "" : sugestao.nome,
        icone: sugestao.icone,
        valor,
        contaParaMeta: sugestao.contaParaMeta,
        itens: [],
      },
    ]);
    setAnuncio(
      `Pote ${outro ? "novo" : sugestao.nome} criado com ${pctInicial}%. Pra você: ${pctDe(livreQueConta(livre - valor), base)}%.`,
    );
    if (outro) abrirOpcoesDepois.current = id;
    else focoPendente.current = idMaisPote(id);
    setCriando(false);
  }

  function remover(id: string) {
    const indice = grupos.findIndex((g) => g.id === id);
    // o "Guardar" não sai (e é sempre o primeiro)
    if (indice <= 0 || grupos[indice].doSistema) return;
    const removido = grupos[indice];
    const acima = grupos[indice - 1];
    focoPendente.current = idPctPote(acima.id);
    uso.salvarGrupos(grupos.filter((g) => g.id !== id));
    setOpcoesAberto(false);
    setAnuncio(`${textosDivisor.poteRemovido(nomeNoAviso(removido))} A parte dele voltou pro Pra você.`);
    toast.mostrar(textosDivisor.poteRemovido(nomeNoAviso(removido)), {
      acao: {
        onClick: () => {
          const atual = usoRef.current;
          if (atual.grupos.some((g) => g.id === removido.id) || !podeAdicionarGrupo(atual.grupos)) return;
          const lista = [...atual.grupos];
          lista.splice(Math.min(indice, lista.length), 0, removido);
          atual.salvarGrupos(lista);
        },
      },
    });
  }

  const partesDaBarra = grupos.map((g, i) => `${nomeDoPote(g)} ${pcts[i]}%, ${formatBRL(reais[i])}`);
  partesDaBarra.push(`Pra você ${pctLivre}%, ${formatBRL(reais[grupos.length])}`);
  const rotuloBarra = `De ${formatBRL(base)} que sobram: ${partesDaBarra.join(". ")}.`;

  return (
    <section aria-labelledby="divisor-titulo" className="min-w-0">
      <h2 id="divisor-titulo" className="eyebrow">
        {textosDivisor.titulo}
      </h2>
      <p className="mt-2 font-bold text-pretty tnum">
        {textosDivisor.equacao(plano.resumo.renda, plano.resumo.custoTotal, base)}
      </p>
      <p className="mt-1 text-sm text-ink-2">{textosDivisor.ajuda}</p>

      {limites.passou && (
        <div className="enter-up mt-4 flex min-w-0 flex-wrap items-center gap-3 rounded-xl bg-warn-soft p-3">
          <p className="min-w-48 flex-1 text-sm font-bold text-warn">{textosDivisor.passouDaSobra(limites.excesso)}</p>
          <button type="button" onClick={uso.ajustar} className={ctaClasses("secondary", "md")}>
            {textosDivisor.ajustar}
          </button>
        </div>
      )}

      <SegmentBar
        height="md"
        enter
        label={rotuloBarra}
        className={cn(
          "mt-5 h-3 transition-[box-shadow] duration-(--duration-base) motion-reduce:transition-none",
          limites.passou && "ring-2 ring-warn",
        )}
        segments={grupos.map((g, i) => ({ value: g.valor, className: corDoPote(g, i) }))}
        rest={{ value: livre, className: COR_PRA_VOCE }}
      />

      <ul className="mt-2 min-w-0 divide-y divide-border">
        <AnimatePresence initial={false}>
          {grupos.map((grupo, i) => (
            // layout="position": só a posição anima quando um vizinho entra ou sai
            <m.li
              key={grupo.id}
              layout="position"
              variants={ITEM}
              initial="initial"
              animate="animate"
              exit="exit"
              className="min-w-0"
            >
              <PoteLinha
                grupo={grupo}
                cor={corDoPote(grupo, i)}
                pct={pcts[i]}
                reais={reais[i]}
                maxPct={pctDoPote(grupo, tetoDe(grupo))}
                podeCrescer={centavos(tetoDe(grupo)) > centavos(grupo.valor)}
                subtitulo={grupo.doSistema && esteMes ? textosDivisor.guardarEsteMes(esteMes) : undefined}
                nomeMeta={nomeMeta}
                degrauDeMetas={degrauDeMetas}
                maxReais={tetoDe(grupo)}
                maxEhTudo={grupos.every((g) => g.id === grupo.id || !(g.valor > 0))}
                onPct={(pct) => definirPct(grupo, pct)}
                onReais={(valor) => definirReais(grupo, valor)}
                onRendimento={(rendimentoMensal) => {
                  trocar(grupo.id, { rendimentoMensal });
                  setAnuncio(
                    rendimentoMensal === undefined
                      ? `${nomeDoPote(grupo)} não rende mais.`
                      : `${nomeDoPote(grupo)} rende ${formatPct(rendimentoMensal, 2)} ao mês.`,
                  );
                }}
                onOpcoes={() => {
                  setOpcoes({ id: grupo.id, focarNome: false });
                  setOpcoesAberto(true);
                }}
              />
            </m.li>
          ))}
        </AnimatePresence>
        <li className="min-w-0">
          <LinhaPraVoce pct={pctLivre} reais={reais[grupos.length]} />
        </li>
      </ul>

      <button
        type="button"
        id={ID_NOVO_POTE}
        onClick={() => {
          setNovoMontado(true);
          setCriando(true);
        }}
        disabled={cheio}
        className="press mt-3 flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong text-sm font-bold text-ink-2 outline-none hover:border-primary hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
      >
        <Plus aria-hidden="true" className="size-4" />
        Novo pote
      </button>
      {cheio && <p className="mt-2 text-sm text-muted-foreground">{textosDivisor.limitePotes}</p>}

      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      <DrawerNovoPote
        open={criando}
        onOpenChange={setCriando}
        onOpenChangeComplete={(aberto) => {
          if (aberto) return;
          setNovoMontado(false);
          const id = abrirOpcoesDepois.current;
          abrirOpcoesDepois.current = null;
          if (id !== null) {
            // "Outro": abre as opções com o campo Nome em foco
            setOpcoes({ id, focarNome: true });
            setOpcoesAberto(true);
          }
        }}
        devolverFoco={() => (abrirOpcoesDepois.current !== null ? false : focoAoFechar())}
        sugestoes={sugestoes}
        nomesUsados={nomesUsados}
        valorInicial={valorInicial}
        pctInicial={pctInicial}
        onCriar={criar}
      />

      <DrawerOpcoesPote
        grupo={grupoAberto}
        open={opcoesAberto}
        onOpenChange={setOpcoesAberto}
        onOpenChangeComplete={(aberto) => {
          if (!aberto) setOpcoes(null);
        }}
        devolverFoco={focoAoFechar}
        focarNome={opcoes?.focarNome ?? false}
        nomeMeta={nomeMeta}
        degrauDeMetas={degrauDeMetas}
        onTrocar={(patch) => grupoAberto && trocar(grupoAberto.id, patch)}
        onRemover={() => grupoAberto && remover(grupoAberto.id)}
        alocacoes={grupoAberto?.doSistema ? alocacoes : undefined}
        voltarProRitmo={
          grupoAberto?.doSistema && ritmo.personalizado && simAtual
            ? {
                rotulo: textosDivisor.voltarProRitmo(ritmoAtual, simAtual.pct),
                onClick: () => {
                  ritmo.escolher(ritmoAtual);
                  setOpcoesAberto(false);
                },
              }
            : undefined
        }
      />
    </section>
  );
}

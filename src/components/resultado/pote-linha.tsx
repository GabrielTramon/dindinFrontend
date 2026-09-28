"use client";

import { Ellipsis, Minus, Pencil, Plus, TrendingUp } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { IconeCategoria } from "@/components/categorias/icone-categoria";
import { passoPct, textosDivisor, textosPote, type Grupo } from "@/domain";
import { formatBRL, mascaraTaxa, taxaDoTexto, textoDaTaxa } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  COR_PRA_VOCE,
  idEditarRendimento,
  idMaisPote,
  idOpcoesPote,
  idPctPote,
  idPote,
  idRendimentoPote,
  MAX_PCT_RENDIMENTO,
  nomeDoPote,
  recadoDoRendimento,
} from "./pote-comum";

/*
  Uma linha de pote, sem caixa: nome, R$ por mês embaixo e, à direita, a % com
  [−] e [+] de 5 pontos. Tocar na % vira campo pra digitar (Enter ou sair
  confirma, Esc cancela). Nada de slider solto: brigaria com a rolagem no
  celular.

  Os botões usam aria-disabled em vez de disabled: quem aperta [+] até o teto
  não perde o foco quando o botão trava.

  Gravar só no commit (clique, Enter, sair do campo); nunca a cada tecla, e
  nunca com o campo vazio.

  Embaixo do R$, o selo "Rende 0,8% ao mês" com um lápis do lado: o lápis
  troca o selo por um campo (Enter ou sair grava, Esc cancela, vazio = não
  rende). A taxa é sempre a que a pessoa digita — o dindin não sugere taxa.

  Fim da edição e foco:
  - Enter/Esc: o campo some e o foco volta pro botão que o abriu (a % ou o
    lápis), sem rolar a página (preventScroll).
  - Sair do campo (Tab, clique, toque em outro lugar): o foco fica onde a
    pessoa foi. E o fechamento espera o clique terminar (useDepoisDoClique):
    fechar no mousedown muda a altura da linha e o cartão do topo, e o clique
    caía em outro lugar.
*/

const BOTAO_PASSO =
  "bg-muted text-foreground hover:bg-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:bg-muted";

const BOTAO_PCT =
  "press flex h-11 min-w-16 shrink-0 items-center justify-center rounded-xl px-1 text-lg font-extrabold tnum outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export interface PoteLinhaProps {
  grupo: Grupo;
  cor: string;
  /** a % do que sobra que o pote tem agora */
  pct: number;
  /** o R$ por mês mostrado (reais inteiros que fecham a soma) */
  reais: number;
  /** a maior % que o pote pode ter agora (o teto exato, não o múltiplo de 5) */
  maxPct: number;
  /** ainda sobra algo no "Pra você" pra dar a este pote */
  podeCrescer: boolean;
  /** complemento da linha do R$: "este mês: cartão" */
  subtitulo?: string;
  /** o nome da meta do perfil, pro recado do rendimento; null = sem meta */
  nomeMeta: string | null;
  /** `plano.degrau === 4`: só aí o dinheiro do "Guardar" vai pra meta */
  degrauDeMetas: boolean;
  /** a pessoa confirmou uma % nova */
  onPct: (pct: number) => void;
  /** a pessoa confirmou um rendimento novo (fração ao mês); undefined = não rende */
  onRendimento: (fracao: number | undefined) => void;
  onOpcoes: () => void;
}

export function PoteLinha({
  grupo,
  cor,
  pct,
  reais,
  maxPct,
  podeCrescer,
  subtitulo,
  nomeMeta,
  degrauDeMetas,
  onPct,
  onRendimento,
  onOpcoes,
}: PoteLinhaProps) {
  const nome = nomeDoPote(grupo);
  const [editando, setEditando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  // a % digitada no campo aberto, ainda sem gravar (null = campo vazio)
  const rascunho = useRef<number | null>(null);
  // o [−]/[+] desta linha rodou com o campo aberto: o fim do campo (que vem depois do clique) não grava de novo
  const passoNoCampo = useRef(false);
  const podeMenos = pct > 0 || grupo.valor > 0;
  const podeMais = podeCrescer;

  function passo(direcao: 1 | -1) {
    // com o campo aberto, o passo parte do que ela digitou (o campo fecha logo depois do clique)
    const deOnde = editando && rascunho.current !== null ? rascunho.current : pct;
    if (editando) passoNoCampo.current = true;
    if (!editando && (direcao > 0 ? !podeMais : !podeMenos)) return;
    setAviso(null);
    // quem recebe decide se o valor muda (a mesma % no teto ainda pode completar o teto exato)
    onPct(passoPct(deOnde, direcao, maxPct));
  }

  return (
    <div id={idPote(grupo.id)} role="group" aria-label={`Pote ${nome}`} className="min-w-0 py-3">
      <div className="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full", cor)} />
        <IconeCategoria icone={grupo.icone} className="hidden shrink-0 text-ink-2 sm:block" />
        <p className="min-w-0 flex-1 truncate font-bold">{nome}</p>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={`Menos 5% em ${nome}`}
            aria-disabled={!podeMenos || undefined}
            onClick={() => passo(-1)}
            className={cn(
              "press flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              BOTAO_PASSO,
            )}
          >
            <Minus aria-hidden="true" className="size-4" />
          </button>

          {editando ? (
            <CampoPct
              id={`pote-${grupo.id}-campo-pct`}
              nome={nome}
              inicial={pct}
              maxPct={maxPct}
              onAviso={setAviso}
              avisoTeto={textosDivisor.maximoAgora(maxPct)}
              onRascunho={(n) => {
                rascunho.current = n;
              }}
              onFim={(valor, via) => {
                setEditando(false);
                // o "máximo agora" era da digitação: depois dela ficaria errado quando outro pote mudar
                setAviso(null);
                if (valor !== null && valor !== pct && !passoNoCampo.current) onPct(valor);
                if (via === "teclado") devolverFoco(idPctPote(grupo.id));
              }}
            />
          ) : (
            <button
              type="button"
              id={idPctPote(grupo.id)}
              onClick={() => {
                setAviso(null);
                rascunho.current = pct;
                passoNoCampo.current = false;
                setEditando(true);
              }}
              aria-label={`${pct}% do que sobra, ${formatBRL(reais)} por mês. Tocar pra digitar`}
              className={BOTAO_PCT}
            >
              {pct}%
            </button>
          )}

          <button
            type="button"
            id={idMaisPote(grupo.id)}
            aria-label={`Mais 5% em ${nome}`}
            aria-disabled={!podeMais || undefined}
            onClick={() => passo(1)}
            className={cn(
              "press flex size-11 shrink-0 items-center justify-center rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              BOTAO_PASSO,
            )}
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>

          <button
            type="button"
            id={idOpcoesPote(grupo.id)}
            aria-label={`Opções do pote ${nome}`}
            onClick={onOpcoes}
            className="press flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Ellipsis aria-hidden="true" className="size-5" />
          </button>
        </div>
      </div>

      <p className="mt-0.5 pl-4.5 text-sm text-ink-2 tnum sm:pl-12">
        {formatBRL(reais)}/mês
        {subtitulo ? <span> · {subtitulo}</span> : null}
      </p>

      <p aria-live="polite" className="pl-4.5 text-sm font-semibold text-foreground empty:hidden sm:pl-12">
        {aviso}
      </p>

      <Rendimento
        grupo={grupo}
        nome={nome}
        nomeMeta={nomeMeta}
        degrauDeMetas={degrauDeMetas}
        onRendimento={onRendimento}
      />
    </div>
  );
}

/** Como a edição terminou: Enter/Esc devolvem o foco; sair do campo deixa o foco onde a pessoa foi. */
type ViaDoFim = "teclado" | "saiu";

/**
 * Devolve o foco pro botão que abriu o campo, no quadro seguinte (o botão só
 * volta pro DOM quando o campo sai) e sem rolar a página.
 */
function devolverFoco(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.focus({ preventScroll: true }));
}

/**
 * Adia o fim de uma edição que veio do blur até o clique que o causou terminar.
 *
 * Tocar ou clicar em outro controle tira o foco do campo já no mousedown.
 * Fechar o campo ali muda a altura da linha (campo → selo, aviso, recado) e até
 * o cartão lá em cima (o prazo com rendimento): o mouseup cai em outro lugar e o
 * clique se perde. Então, com o botão ainda apertado, o fim espera soltar; no
 * toque (mousedown, mouseup e click chegam juntos, depois do pointerup) e no
 * Tab, espera só a volta seguinte do navegador.
 *
 * Quem chama deve ler as props de AGORA quando o fim rodar (o clique pode ter
 * mudado a lista de potes no meio): por isso `useUltimo`.
 */
function useDepoisDoClique(): (fim: () => void) => void {
  const apertado = useRef(false);
  const pendente = useRef<(() => void) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rodarNaProximaVolta = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      const fim = pendente.current;
      pendente.current = null;
      fim?.();
    }, 0);
  }, []);

  useEffect(() => {
    const apertar = () => {
      apertado.current = true;
    };
    const soltar = () => {
      apertado.current = false;
      if (pendente.current) rodarNaProximaVolta();
    };
    window.addEventListener("pointerdown", apertar, true);
    window.addEventListener("pointerup", soltar, true);
    window.addEventListener("pointercancel", soltar, true);
    return () => {
      window.removeEventListener("pointerdown", apertar, true);
      window.removeEventListener("pointerup", soltar, true);
      window.removeEventListener("pointercancel", soltar, true);
      if (timer.current !== null) clearTimeout(timer.current);
      // o campo saiu da tela antes: o que a pessoa digitou não se perde
      const fim = pendente.current;
      pendente.current = null;
      fim?.();
    };
  }, [rodarNaProximaVolta]);

  return useCallback(
    (fim: () => void) => {
      pendente.current = fim;
      if (!apertado.current) rodarNaProximaVolta();
    },
    [rodarNaProximaVolta],
  );
}

/** A versão mais recente de uma função das props, pra quem roda depois do render em que foi criada. */
function useUltimo<T>(valor: T): { readonly current: T } {
  const ref = useRef(valor);
  useLayoutEffect(() => {
    ref.current = valor;
  });
  return ref;
}

export interface RendimentoProps {
  grupo: Grupo;
  nome: string;
  nomeMeta: string | null;
  degrauDeMetas: boolean;
  onRendimento: (fracao: number | undefined) => void;
}

/**
 * "Rende 0,8% ao mês" + lápis. O recado embaixo só aparece quando a taxa NÃO
 * mexe no prazo (sem meta, pote fora da meta, "Guardar" antes do degrau de
 * metas): é quando quem digitou acharia que a conta está quebrada. Quando
 * mexe, quem fala é o cartão do topo.
 */
export function Rendimento({ grupo, nome, nomeMeta, degrauDeMetas, onRendimento }: RendimentoProps) {
  const [editando, setEditando] = useState(false);
  const taxa = grupo.rendimentoMensal;
  const rende = taxa !== undefined && taxa > 0;
  const textoTaxa = rende ? textoDaTaxa(taxa) : "0";
  const recado = recadoDoRendimento(grupo, nomeMeta, degrauDeMetas);

  return (
    <div className="mt-1.5 pl-4.5 sm:pl-12">
      {editando ? (
        <CampoRendimento
          id={idRendimentoPote(grupo.id)}
          nome={nome}
          inicial={taxa}
          onFim={(valor, via) => {
            setEditando(false);
            if (valor !== "cancelou" && valor !== taxa) onRendimento(valor);
            if (via === "teclado") devolverFoco(idEditarRendimento(grupo.id));
          }}
        />
      ) : (
        <div className="flex min-w-0 items-center gap-0.5">
          <span
            className={cn(
              "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold tnum",
              rende ? "bg-primary/12 text-primary dark:bg-primary/18" : "bg-muted text-ink-2",
            )}
          >
            <TrendingUp aria-hidden="true" className="size-3.5" />
            Rende {textoTaxa}% ao mês
          </span>
          <button
            type="button"
            id={idEditarRendimento(grupo.id)}
            aria-label={`Editar quanto ${nome} rende por mês (hoje ${textoTaxa}%)`}
            onClick={() => setEditando(true)}
            className="press -my-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Pencil aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      )}
      {recado && !editando && <p className="mt-1 text-xs text-ink-2">{recado}</p>}
    </div>
  );
}

interface CampoRendimentoProps {
  id: string;
  nome: string;
  inicial: number | undefined;
  /** a fração digitada; undefined = vazio (não rende); "cancelou" = Esc */
  onFim: (valor: number | undefined | "cancelou", via: ViaDoFim) => void;
}

/** o número que a pessoa tentou digitar, antes da máscara travar no teto ("7" → 7) */
function numeroDigitado(bruto: string): number {
  return Number(mascaraTaxa(bruto, Number.POSITIVE_INFINITY).replace(",", "."));
}

/**
 * O rendimento digitado em % ao mês ("0,8"), com a máscara de sempre (até
 * MAX_PCT_RENDIMENTO). Enter ou sair grava; Esc cancela; vazio = não rende.
 * Acima do teto o campo trava no teto e diz por quê.
 */
function CampoRendimento({ id, nome, inicial, onFim }: CampoRendimentoProps) {
  const [texto, setTexto] = useState(textoDaTaxa(inicial));
  const [noTeto, setNoTeto] = useState(false);
  // Enter grava e o blur que vem em seguida não pode gravar de novo
  const terminou = useRef(false);
  const fimAtual = useUltimo(onFim);
  const depoisDoClique = useDepoisDoClique();
  const ajudaId = `${id}-ajuda`;
  const avisoId = `${id}-aviso`;

  function terminar(valor: number | undefined | "cancelou", via: ViaDoFim) {
    if (terminou.current) return;
    terminou.current = true;
    fimAtual.current(valor, via);
  }

  const confirmar = (via: ViaDoFim) => terminar(taxaDoTexto(texto, MAX_PCT_RENDIMENTO) ?? undefined, via);

  function digitar(bruto: string) {
    const numero = numeroDigitado(bruto);
    setNoTeto(Number.isFinite(numero) && numero > MAX_PCT_RENDIMENTO);
    setTexto(mascaraTaxa(bruto, MAX_PCT_RENDIMENTO));
  }

  function tecla(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmar("teclado");
    } else if (e.key === "Escape") {
      // o Esc é do campo: não fecha nada em volta
      e.preventDefault();
      e.stopPropagation();
      terminar("cancelou", "teclado");
    }
  }

  return (
    <div className="enter-up grid min-w-0 gap-1">
      <div className="flex h-11 w-44 items-center gap-1 rounded-xl border border-ring bg-card px-3 ring-3 ring-ring/40">
        <label htmlFor={id} className="sr-only">
          Quanto {nome} rende por mês, em %
        </label>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          autoFocus
          enterKeyHint="done"
          placeholder="0,8"
          value={texto}
          aria-describedby={`${ajudaId} ${avisoId}`}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => digitar(e.target.value)}
          onKeyDown={tecla}
          onBlur={() => depoisDoClique(() => confirmar("saiu"))}
          className="w-0 min-w-0 flex-1 bg-transparent text-right text-base font-extrabold text-foreground tnum outline-none placeholder:font-normal placeholder:text-ink-3"
        />
        <span aria-hidden="true" className="shrink-0 text-sm font-bold text-ink-2">
          % ao mês
        </span>
      </div>
      <p id={avisoId} aria-live="polite" className="text-xs font-semibold text-foreground empty:hidden">
        {noTeto ? textosPote.maxRendimento : null}
      </p>
      <p id={ajudaId} className="text-xs text-ink-2">
        Ex.: 0,8 = 0,8% ao mês. Vazio = não rende. Enter salva, Esc cancela.
      </p>
    </div>
  );
}

interface CampoPctProps {
  id: string;
  nome: string;
  inicial: number;
  maxPct: number;
  avisoTeto: string;
  onAviso: (aviso: string | null) => void;
  /** a % que está no campo a cada tecla, ainda sem gravar; null = vazio */
  onRascunho: (pct: number | null) => void;
  /** null = cancelou (Esc ou campo vazio) */
  onFim: (valor: number | null, via: ViaDoFim) => void;
}

/**
 * A % digitada: inteiro de 0 ao teto. Acima do teto o campo trava no teto e
 * diz por quê. Enter ou sair confirma; Esc cancela. Vazio não grava nada.
 */
function CampoPct({ id, nome, inicial, maxPct, avisoTeto, onAviso, onRascunho, onFim }: CampoPctProps) {
  const [texto, setTexto] = useState(String(inicial));
  // Enter confirma e o blur que vem em seguida não pode confirmar de novo
  const terminou = useRef(false);
  // o fim pode rodar depois do clique que tirou o foco: vale o teto e o onFim de AGORA
  const fimAtual = useUltimo(onFim);
  const maxAtual = useUltimo(maxPct);
  const depoisDoClique = useDepoisDoClique();

  function terminar(valor: number | null, via: ViaDoFim) {
    if (terminou.current) return;
    terminou.current = true;
    fimAtual.current(valor, via);
  }

  function confirmar(via: ViaDoFim) {
    const limpo = texto.trim();
    if (limpo === "") return terminar(null, via);
    const n = Number.parseInt(limpo, 10);
    terminar(Number.isFinite(n) ? Math.min(Math.max(0, n), maxAtual.current) : null, via);
  }

  function digitar(bruto: string) {
    const digitos = bruto.replace(/\D/g, "").slice(0, 3);
    if (digitos === "") {
      setTexto("");
      onRascunho(null);
      return;
    }
    const n = Number.parseInt(digitos, 10);
    if (n > maxPct) {
      setTexto(String(maxPct));
      onRascunho(maxPct);
      onAviso(avisoTeto);
      return;
    }
    onAviso(null);
    setTexto(String(n));
    onRascunho(n);
  }

  function tecla(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmar("teclado");
    } else if (e.key === "Escape") {
      // o Esc é do campo: não fecha nada em volta
      e.preventDefault();
      e.stopPropagation();
      terminar(null, "teclado");
    }
  }

  return (
    <div className="flex h-11 w-16 shrink-0 items-center rounded-xl border border-ring bg-card px-2 ring-3 ring-ring/40">
      <label htmlFor={id} className="sr-only">
        Quanto por cento do que sobra vai pra {nome}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        autoFocus
        enterKeyHint="done"
        value={texto}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => digitar(e.target.value)}
        onKeyDown={tecla}
        onBlur={() => depoisDoClique(() => confirmar("saiu"))}
        className="w-0 min-w-0 flex-1 bg-transparent text-right text-lg font-extrabold text-foreground tnum outline-none"
      />
      <span aria-hidden="true" className="text-lg font-extrabold text-ink-2">
        %
      </span>
    </div>
  );
}

export interface LinhaPraVoceProps {
  pct: number;
  reais: number;
}

/** "Pra você": não tem controle nem mínimo. É o que os potes deixam, de 0% a 100%. */
export function LinhaPraVoce({ pct, reais }: LinhaPraVoceProps) {
  return (
    <div role="group" aria-label="Pra você" className="min-w-0 py-3">
      <div className="flex min-h-11 min-w-0 items-center gap-2">
        <span aria-hidden="true" className={cn("size-2.5 shrink-0 rounded-full", COR_PRA_VOCE)} />
        <IconeCategoria icone="Smile" className="hidden shrink-0 text-ink-2 sm:block" />
        <p className="min-w-0 truncate font-bold">Pra você</p>
        <p className="ml-auto flex h-11 min-w-16 shrink-0 items-center justify-center text-lg font-extrabold tnum mr-24">
          {pct}%
        </p>
      </div>
      <p className="mt-0.5 pl-4.5 text-sm text-ink-2 tnum sm:pl-12">
        {formatBRL(reais)}/mês · {textosDivisor.praVoce(reais)}
      </p>
    </div>
  );
}

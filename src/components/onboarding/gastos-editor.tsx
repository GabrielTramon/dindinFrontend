import { Plus, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef } from "react";
import { IconeCategoria } from "@/components/categorias/icone-categoria";
import { ctaClasses } from "@/components/layout/cta-link";
import { CountUp } from "@/components/motion/count-up";
import { ITEM } from "@/components/motion/springs";
import { staggerStyle } from "@/components/motion/stagger";
import { CheckDraw } from "@/components/ui/drawn-icon";
import { IconButton } from "@/components/ui/icon-button";
import {
  categoriaPorSlug,
  GRUPOS_DO_ONBOARDING,
  ICONE_PADRAO,
  MAX_GASTOS_FIXOS,
  ROTULO_GRUPO,
  SLUG_OUTRO,
} from "@/domain";
import { cn } from "@/lib/utils";
import { MoneyInput } from "./money-input";
import type { GastoRascunho } from "./respostas";

/*
  A pergunta 6. Em vez de um número só somando tudo, a pessoa escolhe as
  categorias que tem e diz quanto sai em cada uma. É o que permite ao plano de
  corte dizer ONDE cortar, e não só quanto.

  `gastos` undefined = ainda não respondeu; [] = não tem gasto fixo nenhum.

  Linhas de gasto são m.li com chave estável por OBJETO (idDe): linha nova entra
  subindo, removida colapsa a altura e as vizinhas deslizam (layout); o total
  conta. Os ids de foco usam a mesma chave — por índice, a linha que está
  saindo animada e a que fica teriam o mesmo id, e o foco caía na errada.
*/

const ID_OUTRO = "gastos-adicionar-outro";

/*
  Identidade estável de cada gasto sem mexer no rascunho (o schema não conhece
  id): um registro objeto → id. O mesmo objeto recebe sempre o mesmo id, e
  `editar` copia o id pro objeto novo. WeakMap: some junto com o objeto.
*/
const IDS = new WeakMap<GastoRascunho, string>();
let proximoId = 0;

function idDe(g: GastoRascunho): string {
  let id = IDS.get(g);
  if (id === undefined) {
    id = `g${proximoId++}`;
    IDS.set(g, id);
  }
  return id;
}

const idValor = (id: string) => `gasto-${id}-valor`;
const idNome = (id: string) => `gasto-${id}-nome`;

const TILE =
  "press glow-card rise-in flex min-h-14 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm font-bold outline-none hover:border-primary hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none";

interface GastosEditorProps {
  gastos: GastoRascunho[] | undefined;
  onChange: (gastos: GastoRascunho[]) => void;
  /** a pergunta, como nome do grupo de escolha */
  legend: string;
  describedBy?: string;
}

export function GastosEditor({ gastos, onChange, legend, describedBy }: GastosEditorProps) {
  const lista = gastos ?? [];
  const cheio = lista.length >= MAX_GASTOS_FIXOS;
  // "outro" pode repetir (cada um tem nome próprio); as do catálogo, não
  const usados = new Set(lista.map((g) => g.categoria).filter((c) => c !== SLUG_OUTRO));
  const total = lista.reduce((acc, g) => acc + (g.valor ?? 0), 0);

  // Adicionar e remover mexem na lista embaixo do foco. O id aqui recebe o foco no render seguinte.
  const focoPendente = useRef<string | null>(null);

  useEffect(() => {
    const id = focoPendente.current;
    if (id === null) return;
    focoPendente.current = null;
    document.getElementById(id)?.focus();
  }, [lista.length]);

  function adicionar(categoria: string) {
    const novo: GastoRascunho = categoria === SLUG_OUTRO ? { categoria, nome: "" } : { categoria };
    const id = idDe(novo);
    focoPendente.current = categoria === SLUG_OUTRO ? idNome(id) : idValor(id);
    onChange([...lista, novo]);
  }

  function editar(indice: number, patch: Partial<GastoRascunho>) {
    onChange(
      lista.map((g, i) => {
        if (i !== indice) return g;
        const novo = { ...g, ...patch };
        IDS.set(novo, idDe(g)); // o objeto novo herda a identidade: a linha não remonta
        return novo;
      }),
    );
  }

  function remover(indice: number) {
    // volta pro gasto vizinho (o de cima; o de baixo se era o primeiro); se era o único, pro botão de adicionar
    const vizinho = lista[indice === 0 ? 1 : indice - 1];
    focoPendente.current = vizinho ? idValor(idDe(vizinho)) : ID_OUTRO;
    onChange(lista.filter((_, i) => i !== indice));
  }

  return (
    <div className="grid gap-6">
      {lista.length > 0 && (
        <div className="grid gap-3">
          <ul className="grid gap-2">
            <AnimatePresence initial={false}>
              {lista.map((gasto, i) => (
                <m.li
                  key={idDe(gasto)}
                  layout
                  variants={ITEM}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                >
                  <GastoItem
                    id={idDe(gasto)}
                    gasto={gasto}
                    onEdit={(patch) => editar(i, patch)}
                    onRemove={() => remover(i)}
                  />
                </m.li>
              ))}
            </AnimatePresence>
          </ul>

          <p className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="eyebrow">Total por mês</span>
            <span className="text-xl font-extrabold tnum">
              <CountUp value={total} />
            </span>
          </p>
        </div>
      )}

      <div role="group" aria-label={legend} aria-describedby={describedBy} className="grid gap-5">
        <p className="eyebrow">{lista.length > 0 ? "Adicionar mais" : "Toque no que sai todo mês"}</p>

        {GRUPOS_DO_ONBOARDING.map(({ grupo, categorias }) => (
          <div key={grupo} className="grid gap-2">
            <p className="text-sm font-bold text-ink-2">{ROTULO_GRUPO[grupo]}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {categorias.map((c, i) => {
                const jaTem = usados.has(c.slug);
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => adicionar(c.slug)}
                    disabled={jaTem || cheio}
                    aria-label={jaTem ? `${c.nome} — já adicionado` : `Adicionar ${c.nome}`}
                    className={cn(TILE)}
                    style={staggerStyle(Math.min(i, 8))}
                  >
                    <IconeCategoria icone={c.icone} className="text-primary" />
                    <span className="min-w-0 leading-tight">{c.nome}</span>
                    {jaTem && <CheckDraw className="ml-auto size-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            id={ID_OUTRO}
            onClick={() => adicionar(SLUG_OUTRO)}
            disabled={cheio}
            className={cn(ctaClasses("secondary", "md"))}
          >
            <Plus aria-hidden="true" className="size-4" />
            Outro gasto
          </button>

          {lista.length === 0 && (
            <button type="button" onClick={() => onChange([])} className={cn(ctaClasses("ghost", "md"))}>
              Não tenho nenhum
            </button>
          )}
        </div>

        {cheio && (
          <p className="text-sm text-muted-foreground">
            Chegou no limite de {MAX_GASTOS_FIXOS} gastos. Junte os menores numa linha só.
          </p>
        )}
      </div>
    </div>
  );
}

interface GastoItemProps {
  /** a identidade da linha (idDe), base dos ids dos campos */
  id: string;
  gasto: GastoRascunho;
  onEdit: (patch: Partial<GastoRascunho>) => void;
  onRemove: () => void;
}

/** Uma linha de gasto. Sem `press` (tem input dentro): transiciona só borda e sombra, e acende ao focar. */
function GastoItem({ id, gasto, onEdit, onRemove }: GastoItemProps) {
  const categoria = categoriaPorSlug(gasto.categoria);
  const livre = gasto.categoria === SLUG_OUTRO;
  const nome = livre ? gasto.nome?.trim() || "esse gasto" : (categoria?.nome ?? "Gasto");

  return (
    <div className="glow-card flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-1 transition-[border-color,box-shadow] duration-(--duration-base) ease-out-expo focus-within:border-ring focus-within:shadow-glow motion-reduce:transition-none">
      <IconeCategoria icone={categoria?.icone ?? ICONE_PADRAO} className="text-primary" />

      {livre ? (
        <>
          <label htmlFor={idNome(id)} className="sr-only">
            Nome do gasto
          </label>
          <input
            id={idNome(id)}
            type="text"
            maxLength={40}
            placeholder="Nome do gasto"
            value={gasto.nome ?? ""}
            onChange={(e) => onEdit({ nome: e.target.value })}
            className="h-11 min-w-0 flex-1 bg-transparent font-bold text-foreground outline-none placeholder:font-normal placeholder:text-ink-3"
          />
        </>
      ) : (
        <span aria-hidden="true" className="min-w-0 flex-1 truncate font-bold">
          {nome}
        </span>
      )}

      <MoneyInput
        id={idValor(id)}
        label={`Quanto sai por mês em ${nome}`}
        hideLabel
        size="sm"
        value={gasto.valor}
        onChange={(valor) => onEdit({ valor })}
        className="w-36 shrink-0"
      />

      <IconButton label={`Remover ${nome}`} icon={X} onClick={onRemove} />
    </div>
  );
}

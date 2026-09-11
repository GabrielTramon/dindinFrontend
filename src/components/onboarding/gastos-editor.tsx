import { Plus, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { IconeCategoria } from "@/components/categorias/icone-categoria";
import { ctaClasses } from "@/components/layout/cta-link";
import {
  categoriaPorSlug,
  GRUPOS_DO_ONBOARDING,
  ICONE_PADRAO,
  MAX_GASTOS_FIXOS,
  ROTULO_GRUPO,
  SLUG_OUTRO,
} from "@/domain";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MoneyInput } from "./money-input";
import type { GastoRascunho } from "./respostas";

/*
  A pergunta 6. Em vez de um número só somando tudo, a pessoa escolhe as
  categorias que tem e diz quanto sai em cada uma. É o que permite ao plano de
  corte dizer ONDE cortar, e não só quanto.

  `gastos` undefined = ainda não respondeu; [] = não tem gasto fixo nenhum.
*/

const ID_OUTRO = "gastos-adicionar-outro";

const idValor = (i: number) => `gasto-${i}-valor`;
const idNome = (i: number) => `gasto-${i}-nome`;

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
    focoPendente.current = categoria === SLUG_OUTRO ? idNome(lista.length) : idValor(lista.length);
    onChange([...lista, categoria === SLUG_OUTRO ? { categoria, nome: "" } : { categoria }]);
  }

  function editar(indice: number, patch: Partial<GastoRascunho>) {
    onChange(lista.map((g, i) => (i === indice ? { ...g, ...patch } : g)));
  }

  function remover(indice: number) {
    // volta pro gasto anterior; se era o único, pro botão de adicionar
    focoPendente.current = lista.length === 1 ? ID_OUTRO : idValor(Math.max(0, indice - 1));
    onChange(lista.filter((_, i) => i !== indice));
  }

  return (
    <div className="grid gap-6">
      {lista.length > 0 && (
        <div className="grid gap-3">
          <ul className="grid gap-2">
            {lista.map((gasto, i) => (
              <li key={i}>
                <GastoItem
                  indice={i}
                  gasto={gasto}
                  onEdit={(patch) => editar(i, patch)}
                  onRemove={() => remover(i)}
                />
              </li>
            ))}
          </ul>

          <p className="flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
              Total por mês
            </span>
            <span className="text-xl font-extrabold tnum">{formatBRL(total)}</span>
          </p>
        </div>
      )}

      <div role="group" aria-label={legend} aria-describedby={describedBy} className="grid gap-5">
        <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
          {lista.length > 0 ? "Adicionar mais" : "Toque no que sai todo mês"}
        </p>

        {GRUPOS_DO_ONBOARDING.map(({ grupo, categorias }) => (
          <div key={grupo} className="grid gap-2">
            <p className="text-sm font-bold text-ink-2">{ROTULO_GRUPO[grupo]}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {categorias.map((c) => {
                const jaTem = usados.has(c.slug);
                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => adicionar(c.slug)}
                    disabled={jaTem || cheio}
                    aria-label={jaTem ? `${c.nome} — já adicionado` : `Adicionar ${c.nome}`}
                    className={cn(
                      "flex min-h-14 items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-left text-sm font-bold transition-colors outline-none",
                      "hover:border-primary hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50",
                      "disabled:pointer-events-none disabled:opacity-40",
                    )}
                  >
                    <IconeCategoria icone={c.icone} className="text-primary" />
                    <span className="min-w-0 leading-tight">{c.nome}</span>
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
            <button
              type="button"
              onClick={() => onChange([])}
              className={cn(ctaClasses("ghost", "md"))}
            >
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
  indice: number;
  gasto: GastoRascunho;
  onEdit: (patch: Partial<GastoRascunho>) => void;
  onRemove: () => void;
}

function GastoItem({ indice, gasto, onEdit, onRemove }: GastoItemProps) {
  const categoria = categoriaPorSlug(gasto.categoria);
  const livre = gasto.categoria === SLUG_OUTRO;
  const nome = livre ? gasto.nome?.trim() || "esse gasto" : (categoria?.nome ?? "Gasto");

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
      <IconeCategoria icone={categoria?.icone ?? ICONE_PADRAO} className="text-primary" />

      {livre ? (
        <>
          <label htmlFor={idNome(indice)} className="sr-only">
            Nome do gasto
          </label>
          <input
            id={idNome(indice)}
            type="text"
            maxLength={40}
            placeholder="Nome do gasto"
            value={gasto.nome ?? ""}
            onChange={(e) => onEdit({ nome: e.target.value })}
            className="min-w-0 flex-1 bg-transparent font-bold outline-none placeholder:font-normal placeholder:text-ink-3"
          />
        </>
      ) : (
        <span aria-hidden="true" className="min-w-0 flex-1 truncate font-bold">
          {nome}
        </span>
      )}

      <MoneyInput
        id={idValor(indice)}
        label={`Quanto sai por mês em ${nome}`}
        hideLabel
        size="md"
        value={gasto.valor}
        onChange={(valor) => onEdit({ valor })}
        className="w-32 shrink-0"
      />

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remover ${nome}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

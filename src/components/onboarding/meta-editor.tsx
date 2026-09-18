import { METAS, type MetaTipo } from "@/domain";
import { IconeCategoria } from "@/components/categorias/icone-categoria";
import { ChipsValor } from "./chips";
import { MoneyInput } from "./money-input";
import type { Respostas } from "./respostas";

/*
  A meta principal: uma só, a que mais importa. Cartões com ícone (a escolha é
  visual e rápida) e o valor logo abaixo.

  "outro" pede nome porque, sem ele, a tela do plano mostraria uma barra de
  progresso sem título — e a meta é justamente o que dá sentido aos grupos.
*/

const SUGESTOES_DE_VALOR = [5000, 10000, 30000, 50000];

interface MetaEditorProps {
  meta: Respostas["meta"];
  onChange: (meta: Respostas["meta"]) => void;
  /** a pergunta, como legenda do grupo de opções (só pro leitor de tela) */
  legend: string;
  idValor: string;
  describedBy?: string;
  invalid?: boolean;
}

export function MetaEditor({ meta, onChange, legend, idValor, describedBy, invalid }: MetaEditorProps) {
  const trocarTipo = (tipo: MetaTipo) =>
    // trocar de tipo preserva o valor já digitado; o nome só existe em "outro"
    onChange({ ...meta, tipo, nome: tipo === "outro" ? meta?.nome : undefined, valorAlvo: meta?.valorAlvo as number });

  return (
    <div className="grid min-w-0 gap-5">
      <fieldset aria-describedby={describedBy} className="min-w-0">
        <legend className="sr-only">{legend}</legend>
        <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
          {METAS.map((m) => {
            const id = `meta-${m.slug}`;
            return (
              <div key={m.slug} className="min-w-0">
                <input
                  type="radio"
                  id={id}
                  name="meta"
                  value={m.slug}
                  checked={meta?.tipo === m.slug}
                  onChange={() => trocarTipo(m.slug)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={id}
                  className="flex min-h-20 cursor-pointer flex-col items-start justify-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-3 transition-colors select-none hover:border-ink-3 peer-checked:border-primary peer-checked:bg-accent peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 motion-reduce:transition-none"
                >
                  <IconeCategoria icone={m.icone} className="text-primary" />
                  <span className="min-w-0 text-sm leading-snug font-bold wrap-break-word text-foreground">
                    {m.nome}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      {meta?.tipo === "outro" && (
        <div className="grid gap-2">
          <label htmlFor="meta-nome" className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Qual é a meta?
          </label>
          <input
            id="meta-nome"
            type="text"
            maxLength={40}
            value={meta.nome ?? ""}
            onChange={(e) => onChange({ ...meta, nome: e.target.value })}
            placeholder="Ex.: notebook novo"
            className="h-12 w-full min-w-0 rounded-xl border border-border bg-card px-3 text-foreground placeholder:text-ink-3 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          />
        </div>
      )}

      {meta?.tipo !== undefined && (
        <div className="grid min-w-0 gap-3">
          <label htmlFor={idValor} className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Quanto você quer juntar?
          </label>
          <MoneyInput
            id={idValor}
            label="Quanto você quer juntar?"
            hideLabel
            value={meta.valorAlvo}
            onChange={(valorAlvo) => onChange({ ...meta, valorAlvo: valorAlvo as number })}
            describedBy={describedBy}
            invalid={invalid}
          />
          <ChipsValor
            valores={SUGESTOES_DE_VALOR}
            value={meta.valorAlvo}
            onChange={(valorAlvo) => onChange({ ...meta, valorAlvo })}
          />
        </div>
      )}
    </div>
  );
}

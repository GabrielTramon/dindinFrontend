import { useState } from "react";
import { METAS, type MetaTipo } from "@/domain";
import { IconeCategoria } from "@/components/categorias/icone-categoria";
import { staggerStyle } from "@/components/motion/stagger";
import { TextField } from "@/components/ui/text-field";
import { ChipsValor } from "./chips";
import { MoneyInput } from "./money-input";
import type { Respostas } from "./respostas";

/*
  A meta principal: uma só, a que mais importa. Cartões com ícone (a escolha é
  visual e rápida) e o valor logo abaixo. Os cartões seguem a receita do
  OptionCards (cascata, press, glow, data-checked); o bloco nome/valor assenta
  ao aparecer (enter-up) e o campo pisca o anel ao tocar num chip.

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
  const [flash, setFlash] = useState(0);

  const trocarTipo = (tipo: MetaTipo) =>
    // trocar de tipo preserva o valor já digitado; o nome só existe em "outro"
    onChange({ ...meta, tipo, nome: tipo === "outro" ? meta?.nome : undefined, valorAlvo: meta?.valorAlvo as number });

  return (
    <div className="grid min-w-0 gap-5">
      <fieldset aria-describedby={describedBy} className="min-w-0">
        <legend className="sr-only">{legend}</legend>
        <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
          {METAS.map((opcao, i) => {
            const id = `meta-${opcao.slug}`;
            const checked = meta?.tipo === opcao.slug;
            return (
              <div key={opcao.slug} className="rise-in min-w-0" style={staggerStyle(i)}>
                <input
                  type="radio"
                  id={id}
                  name="meta"
                  value={opcao.slug}
                  checked={checked}
                  onChange={() => trocarTipo(opcao.slug)}
                  className="peer sr-only"
                />
                <label
                  htmlFor={id}
                  data-checked={checked || undefined}
                  className="group press glow-card relative flex min-h-20 cursor-pointer flex-col items-start justify-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-3 select-none data-checked:border-primary data-checked:bg-accent data-checked:shadow-card-hover peer-focus-visible:ring-3 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
                >
                  <IconeCategoria icone={opcao.icone} className="text-primary" />
                  <span className="min-w-0 text-sm leading-snug font-bold wrap-break-word text-foreground">
                    {opcao.nome}
                  </span>
                </label>
              </div>
            );
          })}
        </div>
      </fieldset>

      {meta?.tipo === "outro" && (
        <TextField
          id="meta-nome"
          label="Qual é a meta?"
          maxLength={40}
          value={meta.nome ?? ""}
          onChange={(e) => onChange({ ...meta, nome: e.target.value })}
          placeholder="Ex.: notebook novo"
          className="enter-up"
        />
      )}

      {meta?.tipo !== undefined && (
        <div className="enter-up grid min-w-0 gap-3">
          <label htmlFor={idValor} className="eyebrow">
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
            flashKey={flash}
          />
          <ChipsValor
            valores={SUGESTOES_DE_VALOR}
            value={meta.valorAlvo}
            onChange={(valorAlvo) => {
              onChange({ ...meta, valorAlvo });
              setFlash((f) => f + 1);
            }}
          />
        </div>
      )}
    </div>
  );
}

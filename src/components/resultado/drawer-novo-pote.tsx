"use client";

import { IconeCategoria } from "@/components/categorias/icone-categoria";
import { staggerStyle } from "@/components/motion/stagger";
import { CheckDraw } from "@/components/ui/drawn-icon";
import { Drawer } from "@/components/ui/drawer";
import { textosDivisor, textosPote, type GrupoSugerido } from "@/domain";

/*
  "Novo pote": as sugestões em tiles de 2 colunas. Um toque cria o pote (com
  10% da sobra, sem passar do que está no "Pra você") e fecha. "Outro" cria
  sem nome e quem chamou abre as opções com o campo Nome em foco. O aviso de
  "sem espaço" só aparece com menos de R$ 1 no "Pra você" (aí ele nasce em 0).

  "Eu mesmo" não aparece: agora existe o "Pra você". Os potes "Eu mesmo" já
  gravados continuam valendo. Nome já usado fica desabilitado, com o check.
*/

/** a receita dos tiles de categoria do gastos-editor, sem cartão em volta */
const TILE =
  "press rise-in flex min-h-14 min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-left text-sm font-bold outline-none hover:border-primary hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:pointer-events-none disabled:border-transparent disabled:bg-muted disabled:text-muted-foreground";

export interface DrawerNovoPoteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  /** o finalFocus: o elemento que recebe o foco ao fechar (o [+] do pote novo), true = quem abriu, false = ninguém */
  devolverFoco: () => HTMLElement | boolean;
  sugestoes: GrupoSugerido[];
  /** nomes já usados, em minúsculas */
  nomesUsados: Set<string>;
  /** o R$ com que o pote novo começa; 0 = menos de R$ 1 no "Pra você" */
  valorInicial: number;
  /** a mesma coisa em % do que sobra (pctDe) */
  pctInicial: number;
  onCriar: (sugestao: GrupoSugerido) => void;
}

export function DrawerNovoPote({
  open,
  onOpenChange,
  onOpenChangeComplete,
  devolverFoco,
  sugestoes,
  nomesUsados,
  valorInicial,
  pctInicial,
  onCriar,
}: DrawerNovoPoteProps) {
  const semEspaco = !(valorInicial > 0);
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
      finalFocus={() => devolverFoco()}
      title="Novo pote"
      description={semEspaco ? undefined : textosPote.poteNovoComeca(pctInicial, valorInicial)}
    >
      {semEspaco && (
        <p className="mb-4 rounded-xl bg-warn-soft px-4 py-3 text-sm font-semibold text-warn">
          {textosDivisor.semEspaco}
        </p>
      )}
      <div role="group" aria-label="Sugestões de pote" className="grid min-w-0 grid-cols-2 gap-2">
        {sugestoes.map((s, i) => {
          const repetido = s.slug !== "outro" && nomesUsados.has(s.nome.toLowerCase());
          return (
            <button
              key={s.slug}
              type="button"
              onClick={() => onCriar(s)}
              disabled={repetido}
              aria-label={repetido ? `${s.nome}: já criado` : `Criar pote ${s.nome}`}
              className={TILE}
              style={staggerStyle(Math.min(i, 8))}
            >
              <IconeCategoria icone={s.icone} className="shrink-0 text-primary" />
              <span className="min-w-0 leading-tight">{s.nome}</span>
              {repetido && <CheckDraw className="ml-auto size-4" />}
            </button>
          );
        })}
      </div>
    </Drawer>
  );
}

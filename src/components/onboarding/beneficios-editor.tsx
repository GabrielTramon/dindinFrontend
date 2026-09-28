import { Plus, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef } from "react";
import { IconeCategoria } from "@/components/categorias/icone-categoria";
import { ITEM } from "@/components/motion/springs";
import { IconButton } from "@/components/ui/icon-button";
import { BENEFICIOS, beneficioPorTipo, MAX_BENEFICIOS, type TipoBeneficio } from "@/domain";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MoneyInput } from "./money-input";
import type { ErroNaLinha } from "./passos";
import type { BeneficioRascunho } from "./respostas";

/*
  Os vales, embaixo do salário (pergunta 1). Opcionais: sem nenhum, a pergunta
  é a de sempre. Cada tipo do catálogo entra uma vez; "Outro" pode repetir,
  cada um com o seu nome — o mesmo desenho dos gastos fixos.

  O aviso de que o vale só paga gasto (e nunca vira dinheiro guardado) fica à
  vista, e não numa ajuda escondida: é a regra que faz o número do plano ser
  diferente de "salário + vale".

  Linhas com chave estável por OBJETO (idDe), como em gastos-editor: a linha
  que sai anima e o foco não cai na vizinha errada.
*/

const IDS = new WeakMap<BeneficioRascunho, string>();
let proximoId = 0;

function idDe(b: BeneficioRascunho): string {
  let id = IDS.get(b);
  if (id === undefined) {
    id = `b${proximoId++}`;
    IDS.set(b, id);
  }
  return id;
}

const idValor = (id: string) => `beneficio-${id}-valor`;
const idNome = (id: string) => `beneficio-${id}-nome`;
const ID_TITULO = "beneficios-titulo";
const ID_OUTRO = "beneficios-adicionar-outro";

const PILULA =
  "press inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-sm font-bold text-ink-2 outline-none select-none hover:border-primary hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50";

interface BeneficiosEditorProps {
  beneficios: BeneficioRascunho[] | undefined;
  onChange: (beneficios: BeneficioRascunho[]) => void;
  /** a linha e o campo que a mensagem cita */
  erroEm?: ErroNaLinha;
  /** o que está errado num vale digitado */
  erro?: string;
  /** a linha pela metade que segura o Continuar */
  falta?: string;
  /** desconto do VT no holerite, quando a pessoa informou o bruto */
  descontoVT?: number;
  idMensagem: string;
}

export function BeneficiosEditor({ beneficios, onChange, erroEm, erro, falta, descontoVT, idMensagem }: BeneficiosEditorProps) {
  const lista = beneficios ?? [];
  const cheio = lista.length >= MAX_BENEFICIOS;
  const usados = new Set(lista.map((b) => b.tipo).filter((t) => t !== "outro"));
  const disponiveis = BENEFICIOS.filter((b) => b.tipo !== "outro" && !usados.has(b.tipo));

  // adicionar e remover mexem na lista embaixo do foco; o id aqui recebe o foco no render seguinte
  const focoPendente = useRef<string | null>(null);
  useEffect(() => {
    const id = focoPendente.current;
    if (id === null) return;
    focoPendente.current = null;
    document.getElementById(id)?.focus();
  }, [lista.length]);

  function adicionar(tipo: TipoBeneficio) {
    const novo: BeneficioRascunho = tipo === "outro" ? { tipo, nome: "" } : { tipo };
    const id = idDe(novo);
    focoPendente.current = tipo === "outro" ? idNome(id) : idValor(id);
    onChange([...lista, novo]);
  }

  function editar(indice: number, patch: Partial<BeneficioRascunho>) {
    onChange(
      lista.map((b, i) => {
        if (i !== indice) return b;
        const novo = { ...b, ...patch };
        IDS.set(novo, idDe(b));
        return novo;
      }),
    );
  }

  function remover(indice: number) {
    const vizinho = lista[indice === 0 ? 1 : indice - 1];
    focoPendente.current = vizinho ? idValor(idDe(vizinho)) : ID_OUTRO;
    onChange(lista.filter((_, i) => i !== indice));
  }

  const mensagem = erro ?? falta;

  return (
    <section aria-labelledby={ID_TITULO} className="grid min-w-0 gap-3 border-t pt-6">
      <div className="grid gap-1">
        <h2 id={ID_TITULO} className="eyebrow">
          Vales e benefícios <span className="font-normal normal-case tracking-normal">(se tiver)</span>
        </h2>
        <p className="text-sm text-ink-2">
          O vale entra no plano pagando os gastos que ele cobre, como mercado, almoço e transporte. O que sobra no cartão
          não vira dinheiro guardado.
        </p>
      </div>

      {lista.length > 0 && (
        <ul className="grid min-w-0 gap-2">
          <AnimatePresence initial={false}>
            {lista.map((b, i) => (
              <m.li key={idDe(b)} layout variants={ITEM} initial="initial" animate="animate" exit="exit" className="min-w-0">
                <BeneficioItem
                  id={idDe(b)}
                  beneficio={b}
                  invalido={erroEm?.indice === i ? erroEm.campo : undefined}
                  idMensagem={idMensagem}
                  onEdit={(patch) => editar(i, patch)}
                  onRemove={() => remover(i)}
                />
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      )}

      {descontoVT !== undefined && descontoVT > 0 && (
        <p className="enter-up text-sm text-ink-2 tnum">
          A empresa pode descontar até 6% do salário pelo vale-transporte: {formatBRL(descontoVT)}, já tirados da
          estimativa do líquido.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {disponiveis.map((b) => (
          <button key={b.tipo} type="button" onClick={() => adicionar(b.tipo)} disabled={cheio} className={PILULA}>
            <Plus aria-hidden="true" className="size-4" />
            {b.nome}
          </button>
        ))}
        <button type="button" id={ID_OUTRO} onClick={() => adicionar("outro")} disabled={cheio} className={PILULA}>
          <Plus aria-hidden="true" className="size-4" />
          Outro
        </button>
      </div>

      <p
        id={idMensagem}
        aria-live="polite"
        className={cn("text-sm", erro ? "font-bold text-warn" : "text-ink-2", !mensagem && "sr-only")}
      >
        {mensagem && (
          <span key={mensagem} className="rise-in block">
            {mensagem}
          </span>
        )}
      </p>
    </section>
  );
}

interface BeneficioItemProps {
  id: string;
  beneficio: BeneficioRascunho;
  /** o campo desta linha que a mensagem cita ("valor" ou "nome") */
  invalido?: string;
  idMensagem: string;
  onEdit: (patch: Partial<BeneficioRascunho>) => void;
  onRemove: () => void;
}

function BeneficioItem({ id, beneficio, invalido, idMensagem, onEdit, onRemove }: BeneficioItemProps) {
  const catalogo = beneficioPorTipo(beneficio.tipo);
  const livre = beneficio.tipo === "outro";
  const nome = livre ? beneficio.nome?.trim() || "esse benefício" : (catalogo?.nome ?? "Benefício");
  const nomeInvalido = livre && invalido === "nome";
  const valorInvalido = invalido === "valor";

  return (
    <div className="glow-card flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-3 py-1 transition-[border-color,box-shadow] duration-(--duration-base) ease-out-expo focus-within:border-ring focus-within:shadow-glow has-aria-invalid:border-warn motion-reduce:transition-none">
      <IconeCategoria icone={catalogo?.icone ?? "Ticket"} className="text-primary" />

      {livre ? (
        <>
          <label htmlFor={idNome(id)} className="sr-only">
            Nome do benefício
          </label>
          <input
            id={idNome(id)}
            type="text"
            maxLength={40}
            placeholder="Ex.: home office"
            value={beneficio.nome ?? ""}
            onChange={(e) => onEdit({ nome: e.target.value })}
            aria-invalid={nomeInvalido || undefined}
            aria-describedby={nomeInvalido ? idMensagem : undefined}
            className="h-11 w-0 min-w-0 flex-1 bg-transparent font-bold text-foreground outline-none placeholder:font-normal placeholder:text-ink-3"
          />
        </>
      ) : (
        <span aria-hidden="true" className="min-w-0 flex-1 truncate font-bold">
          {nome}
        </span>
      )}

      <MoneyInput
        id={idValor(id)}
        label={`Quanto vem por mês de ${nome}`}
        hideLabel
        size="sm"
        value={beneficio.valor}
        onChange={(valor) => onEdit({ valor })}
        describedBy={valorInvalido ? idMensagem : undefined}
        invalid={valorInvalido}
        className="w-28 shrink-0 sm:w-36"
      />

      <IconButton label={`Remover ${nome}`} icon={X} onClick={onRemove} />
    </div>
  );
}

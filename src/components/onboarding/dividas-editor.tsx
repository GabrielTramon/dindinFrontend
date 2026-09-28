import { useEffect, useRef } from "react";
import { ctaClasses } from "@/components/layout/cta-link";
import { MAX_DIVIDAS, ROTULO_DIVIDA, TIPOS_DIVIDA } from "@/domain";
import { cn } from "@/lib/utils";
import { ChipsRadio } from "./chips";
import { MoneyInput } from "./money-input";
import { OptionCards } from "./option-cards";
import type { ErroNaLinha } from "./passos";
import type { DividaRascunho } from "./respostas";

/*
  A pergunta 7. Primeiro "devo ou não devo"; se deve, uma lista de dívidas
  (mínimo 1, máximo MAX_DIVIDAS), cada uma com tipo, saldo e parcela opcional.
  `dividas` undefined = ainda não respondeu; [] = não devo nada.

  Sem card por dívida: divisórias. Uma dívida nova assenta subindo (enter-up,
  @starting-style). Sem motion aqui de propósito: as chaves são índices, e a
  saída não é animada.
*/

type Escolha = "nao" | "sim";

const ESCOLHAS: readonly { value: Escolha; titulo: string; descricao: string }[] = [
  { value: "nao", titulo: "Não devo nada", descricao: "Nem cartão, nem empréstimo, nem financiamento" },
  { value: "sim", titulo: "Tenho dívida", descricao: "Cartão, cheque especial, empréstimo, financiamento…" },
];

const OPCOES_TIPO = TIPOS_DIVIDA.map((t) => ({ value: t, label: ROTULO_DIVIDA[t] }));

const AJUDA_ROTATIVO = "Rotativo é quando você paga só o mínimo da fatura e o resto vira juros.";

const AJUDA_PARCELA = "Se essa parcela já entrou nos gastos ou no valor da moradia, deixe em branco.";

const ID_ADICIONAR = "dividas-adicionar";

function idDoTitulo(numero: number): string {
  return `divida-${numero}-titulo`;
}

interface DividasEditorProps {
  dividas: DividaRascunho[] | undefined;
  onChange: (dividas: DividaRascunho[]) => void;
  /** a pergunta, como legenda do grupo "devo / não devo" */
  legend: string;
  describedBy?: string;
  /** id da linha de erro do passo: o campo com erro aponta pra ela */
  idErro?: string;
  /** a dívida e o campo que a linha de erro cita */
  erroEm?: ErroNaLinha;
}

export function DividasEditor({ dividas, onChange, legend, describedBy, idErro, erroEm }: DividasEditorProps) {
  const escolha: Escolha | undefined =
    dividas === undefined ? undefined : dividas.length === 0 ? "nao" : "sim";
  const lista = dividas ?? [];

  // Adicionar e remover mudam a lista embaixo do foco: quem clicou "Remover" perderia
  // o lugar (o botão some com o item). O id aqui recebe o foco no render seguinte.
  const focoPendente = useRef<string | null>(null);

  // "Não devo nada" apaga a lista do rascunho; um toque sem querer não pode perder o que foi
  // digitado. A lista fica guardada enquanto a pergunta está aberta e volta com "Tenho dívida".
  const guardadas = useRef<DividaRascunho[]>([]);

  useEffect(() => {
    const id = focoPendente.current;
    if (id === null) return;
    focoPendente.current = null;
    document.getElementById(id)?.focus();
  }, [lista.length]);

  function escolher(v: Escolha) {
    if (v === "nao") {
      if (lista.length > 0) guardadas.current = lista;
      onChange([]);
      return;
    }
    if (lista.length > 0) onChange(lista);
    else onChange(guardadas.current.length > 0 ? guardadas.current : [{}]);
  }

  function editar(indice: number, patch: Partial<DividaRascunho>) {
    onChange(lista.map((d, i) => (i === indice ? { ...d, ...patch } : d)));
  }

  function remover(indice: number) {
    // vai pra dívida anterior (ou pra que tomou o lugar, se era a primeira); se sobrou uma só, pro "Adicionar"
    focoPendente.current = lista.length === 2 ? ID_ADICIONAR : idDoTitulo(Math.max(1, indice));
    onChange(lista.filter((_, i) => i !== indice));
  }

  function adicionar() {
    focoPendente.current = idDoTitulo(lista.length + 1);
    onChange([...lista, {}]);
  }

  return (
    <div className="grid gap-6">
      <OptionCards
        name="tem-divida"
        legend={legend}
        options={ESCOLHAS}
        value={escolha}
        onChange={escolher}
        describedBy={describedBy}
      />

      {escolha === "sim" && (
        <div className="grid gap-4">
          <ul className="grid gap-4">
            {lista.map((divida, i) => (
              // a divisória fica no li: o div de dentro é sempre o primeiro filho do li, e `first:` nunca a tiraria
              <li key={i} className="enter-up border-t pt-4 first:border-t-0 first:pt-0">
                <DividaItem
                  numero={i + 1}
                  divida={divida}
                  podeRemover={lista.length > 1}
                  invalido={erroEm?.indice === i ? erroEm.campo : undefined}
                  idErro={idErro}
                  onEdit={(patch) => editar(i, patch)}
                  onRemove={() => remover(i)}
                />
              </li>
            ))}
          </ul>

          {lista.length < MAX_DIVIDAS && (
            <button
              type="button"
              id={ID_ADICIONAR}
              onClick={adicionar}
              className={cn(ctaClasses("secondary", "md"), "justify-self-start")}
            >
              Adicionar outra dívida
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface DividaItemProps {
  numero: number;
  divida: DividaRascunho;
  podeRemover: boolean;
  /** o campo desta dívida que a linha de erro cita ("tipo", "saldo" ou "parcela") */
  invalido?: string;
  idErro?: string;
  onEdit: (patch: Partial<DividaRascunho>) => void;
  onRemove: () => void;
}

function DividaItem({ numero, divida, podeRemover, invalido, idErro, onEdit, onRemove }: DividaItemProps) {
  const prefixo = `divida-${numero}`;
  const tituloId = idDoTitulo(numero);
  const idAjudaParcela = `${prefixo}-parcela-ajuda`;
  const tipoInvalido = invalido === "tipo";
  /** a linha de erro descreve só o campo que ela cita */
  const erroDe = (campo: string) => (invalido === campo ? idErro : undefined);

  return (
    <div role="group" aria-labelledby={tituloId} className="grid gap-4">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <h2 id={tituloId} tabIndex={-1} className="eyebrow outline-none">
          Dívida {numero}
        </h2>
        {podeRemover && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remover dívida ${numero}`}
            className={cn(ctaClasses("ghost", "md"), "-mr-3")}
          >
            Remover
          </button>
        )}
      </div>

      <div className="grid gap-2">
        {/* o rótulo visível é só pra quem vê: o grupo já se chama "Tipo da dívida N" e seria lido duas vezes */}
        <p aria-hidden="true" className={cn("eyebrow", tipoInvalido && "text-warn")}>
          Tipo
        </p>
        {/* o erro "escolha o tipo" aponta pro próprio grupo de chips */}
        <ChipsRadio
          name={`${prefixo}-tipo`}
          options={OPCOES_TIPO}
          value={divida.tipo}
          onChange={(tipo) => onEdit({ tipo })}
          label={`Tipo da dívida ${numero}`}
          invalid={tipoInvalido}
          describedBy={erroDe("tipo")}
        />
        {divida.tipo === "rotativo" && (
          <p className="text-sm text-muted-foreground">{AJUDA_ROTATIVO}</p>
        )}
      </div>

      <MoneyInput
        id={`${prefixo}-saldo`}
        label="Quanto deve no total"
        size="md"
        value={divida.saldo}
        onChange={(saldo) => onEdit({ saldo })}
        describedBy={erroDe("saldo")}
        invalid={invalido === "saldo"}
      />

      <div className="grid gap-2">
        <MoneyInput
          id={`${prefixo}-parcela`}
          label="Parcela por mês, se tiver"
          size="md"
          value={divida.parcela}
          onChange={(parcela) => onEdit({ parcela })}
          describedBy={[idAjudaParcela, erroDe("parcela")].filter(Boolean).join(" ")}
          invalid={invalido === "parcela"}
        />
        {/* a mesma parcela nos gastos (ex.: financiamento do carro) ou na moradia sairia duas vezes da conta */}
        <p id={idAjudaParcela} className="text-sm text-muted-foreground">
          {AJUDA_PARCELA}
        </p>
      </div>
    </div>
  );
}

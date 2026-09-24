"use client";

import { Switch } from "@base-ui/react/switch";
import { Plus, RotateCcw, Trash2, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { ctaClasses } from "@/components/layout/cta-link";
import { ITEM } from "@/components/motion/springs";
import { MoneyInput } from "@/components/onboarding/money-input";
import { Drawer } from "@/components/ui/drawer";
import { IconButton } from "@/components/ui/icon-button";
import { TextField } from "@/components/ui/text-field";
import { MAX_ITENS_POR_GRUPO, podeAdicionarItem, textosPote, type Grupo, type ItemGrupo } from "@/domain";
import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  idAdicionarItem,
  idNomeItem,
  idNomePote,
  idValorItem,
  maxDoItem,
  nomeDoPote,
  novoId,
  restanteDoPote,
} from "./pote-comum";

/*
  "Opções do pote {nome}": tudo o que era o cartão de grupo do antigo editor
  (grupos-editor.tsx) mora aqui, fora da página. Nada da lógica se perdeu:

  - Nome (TextField, 40 caracteres; não existe no "Guardar");
  - "Entra na meta {Viagem}" (contaParaMeta; no "Guardar" vira
    sistemaContaParaMeta via paraGuardado);
  - o rendimento NÃO mora aqui: fica na própria linha do pote ("Rende 0,8% ao
    mês" + lápis), à vista, que é onde a pessoa procura;
  - "Detalhar este pote": itens em R$ (até 5), cada um limitado ao que cabe no
    pote, com "Ainda sem nome dentro de …";
  - só no "Guardar": pra onde o plano manda esse dinheiro este mês e, se a %
    foi escolhida à mão, "Voltar pro Equilibrado (70%)";
  - "Remover pote" (não existe no "Guardar").

  Foco: adicionar e remover item mexem na lista embaixo do foco; o id em
  `focoPendente` recebe o foco no render seguinte (a mesma receita de antes).
*/

export interface AlocacaoDoGuardar {
  titulo: string;
  /** reais inteiros que fecham a soma do "Guardar" */
  reais: number;
}

export interface DrawerOpcoesPoteProps {
  /** o pote aberto; null = nenhum (a gaveta fica fechada) */
  grupo: Grupo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  /** o finalFocus: o elemento que recebe o foco ao fechar (o pote de cima, depois de remover), true = quem abriu */
  devolverFoco: () => HTMLElement | boolean;
  /** abre com o campo Nome em foco (pote "Outro" recém-criado) */
  focarNome: boolean;
  /** o nome da meta do perfil; null = a pessoa ainda não escolheu uma */
  nomeMeta: string | null;
  /** `plano.degrau === 4`: antes disso o dinheiro do "Guardar" ainda não vai pra meta */
  degrauDeMetas: boolean;
  onTrocar: (patch: Partial<Grupo>) => void;
  onRemover: () => void;
  /** só no "Guardar": pra onde o plano manda esse dinheiro este mês */
  alocacoes?: AlocacaoDoGuardar[];
  /** só no "Guardar" personalizado: "Voltar pro Equilibrado (70%)" */
  voltarProRitmo?: { rotulo: string; onClick: () => void };
}

export function DrawerOpcoesPote({
  grupo,
  open,
  onOpenChange,
  onOpenChangeComplete,
  devolverFoco,
  focarNome,
  nomeMeta,
  degrauDeMetas,
  onTrocar,
  onRemover,
  alocacoes,
  voltarProRitmo,
}: DrawerOpcoesPoteProps) {
  const nome = grupo ? nomeDoPote(grupo) : "";
  const sistema = grupo?.doSistema === true;

  return (
    <Drawer
      open={open && grupo !== null}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={onOpenChangeComplete}
      initialFocus={
        focarNome && grupo && !sistema ? () => document.getElementById(idNomePote(grupo.id)) ?? true : undefined
      }
      finalFocus={() => devolverFoco()}
      title={grupo ? `Opções do pote ${nome}` : "Opções do pote"}
    >
      {grupo && (
        <ConteudoOpcoes
          key={grupo.id}
          grupo={grupo}
          nome={nome}
          sistema={sistema}
          nomeMeta={nomeMeta}
          degrauDeMetas={degrauDeMetas}
          onTrocar={onTrocar}
          onRemover={onRemover}
          alocacoes={alocacoes}
          voltarProRitmo={voltarProRitmo}
        />
      )}
    </Drawer>
  );
}

interface ConteudoOpcoesProps {
  grupo: Grupo;
  nome: string;
  sistema: boolean;
  nomeMeta: string | null;
  degrauDeMetas: boolean;
  onTrocar: (patch: Partial<Grupo>) => void;
  onRemover: () => void;
  alocacoes?: AlocacaoDoGuardar[];
  voltarProRitmo?: { rotulo: string; onClick: () => void };
}

function ConteudoOpcoes({
  grupo,
  nome,
  sistema,
  nomeMeta,
  degrauDeMetas,
  onTrocar,
  onRemover,
  alocacoes,
  voltarProRitmo,
}: ConteudoOpcoesProps) {
  const cabeMaisItem = podeAdicionarItem(grupo);
  const restante = restanteDoPote(grupo);

  const focoPendente = useRef<string | null>(null);
  const assinatura = grupo.itens.map((i) => i.id).join("|");
  useEffect(() => {
    const id = focoPendente.current;
    if (id === null) return;
    focoPendente.current = null;
    document.getElementById(id)?.focus();
  }, [assinatura]);

  function adicionarItem() {
    if (!podeAdicionarItem(grupo)) return;
    const id = novoId();
    focoPendente.current = idNomeItem(id);
    onTrocar({ itens: [...grupo.itens, { id, nome: "", valor: 0 }] });
  }

  function editarItem(itemId: string, patch: Partial<ItemGrupo>) {
    onTrocar({ itens: grupo.itens.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) });
  }

  function removerItem(itemId: string) {
    const indice = grupo.itens.findIndex((i) => i.id === itemId);
    const anterior = grupo.itens[indice - 1];
    focoPendente.current = anterior ? idNomeItem(anterior.id) : idAdicionarItem(grupo.id);
    onTrocar({ itens: grupo.itens.filter((i) => i.id !== itemId) });
  }

  const metaTitulo = nomeMeta ? `Entra na meta ${nomeMeta}` : "Entra na minha meta";
  // antes do degrau de metas o "Guardar" paga fôlego, dívida ou reserva: dizer que ele soma na meta seria mentira
  const metaAjuda = !nomeMeta
    ? "Você ainda não escolheu uma meta. Quando escolher, este pote já entra na conta."
    : sistema && !degrauDeMetas
      ? textosPote.guardarAindaNaoEntra(nomeMeta)
      : `O valor deste pote soma no tempo até a ${nomeMeta}.`;

  return (
    <div className="grid min-w-0 gap-5">
      {!sistema && (
        <TextField
          id={idNomePote(grupo.id)}
          label="Nome"
          maxLength={40}
          placeholder="Ex.: Namoro"
          value={grupo.nome}
          onChange={(e) => onTrocar({ nome: e.target.value })}
        />
      )}

      {sistema && alocacoes && alocacoes.length > 0 && (
        <div className="grid min-w-0 gap-1.5">
          <p className="text-sm font-bold">Este mês o plano usa isso em:</p>
          <ul className="grid min-w-0 gap-1 text-sm text-ink-2">
            {alocacoes.map((a) => (
              <li key={a.titulo} className="flex min-w-0 justify-between gap-3">
                <span className="min-w-0">{a.titulo}</span>
                <span className="shrink-0 tnum">{formatBRL(a.reais)}</span>
              </li>
            ))}
          </ul>
          {voltarProRitmo && (
            <button
              type="button"
              onClick={voltarProRitmo.onClick}
              className={cn(ctaClasses("secondary", "md"), "mt-2 justify-self-start")}
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              {voltarProRitmo.rotulo}
            </button>
          )}
        </div>
      )}

      <div className="grid min-w-0 gap-4 border-t pt-4">
        <Interruptor
          checked={grupo.contaParaMeta}
          onChange={(contaParaMeta) => onTrocar({ contaParaMeta })}
          titulo={metaTitulo}
          ajuda={metaAjuda}
        />
      </div>

      <div className="grid min-w-0 gap-2 border-t pt-4">
        {/* `empty:hidden`: a lista fica montada pra última linha ainda sair animada */}
        <ul className="grid min-w-0 gap-1 empty:hidden">
          <AnimatePresence initial={false}>
            {grupo.itens.map((item) => (
              <m.li
                key={item.id}
                layout
                variants={ITEM}
                initial="initial"
                animate="animate"
                exit="exit"
                className="min-w-0"
              >
                <LinhaItem
                  item={item}
                  grupoNome={nome}
                  maximo={maxDoItem(grupo, item.id)}
                  onNome={(nomeItem) => editarItem(item.id, { nome: nomeItem })}
                  onValor={(valor) => editarItem(item.id, { valor })}
                  onRemover={() => removerItem(item.id)}
                />
              </m.li>
            ))}
          </AnimatePresence>
        </ul>

        {grupo.itens.length > 0 && restante > 0 && (
          <p className="text-sm text-ink-2 tnum">
            Ainda sem nome dentro de {nome}: {formatBRL(restante)}
          </p>
        )}

        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button
            type="button"
            id={idAdicionarItem(grupo.id)}
            onClick={adicionarItem}
            disabled={!cabeMaisItem}
            className={cn(ctaClasses("secondary", "md"), "justify-self-start")}
          >
            <Plus aria-hidden="true" className="size-4" />
            {grupo.itens.length === 0 ? "Detalhar este pote" : "Adicionar"}
          </button>
          {!cabeMaisItem && (
            <p className="text-sm text-muted-foreground">
              Chegou no limite de {MAX_ITENS_POR_GRUPO} linhas aqui dentro.
            </p>
          )}
        </div>
      </div>

      {!sistema && (
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={onRemover}
            className={cn(ctaClasses("ghost", "md"), "-ml-2 text-warn hover:text-warn")}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Remover pote
          </button>
        </div>
      )}
    </div>
  );
}

interface InterruptorProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  titulo: string;
  ajuda: string;
}

/** Switch do base-ui com título e ajuda ligados por aria-labelledby/-describedby. */
function Interruptor({ checked, onChange, titulo, ajuda }: InterruptorProps) {
  const id = useId();
  const tituloId = `${id}-titulo`;
  const ajudaId = `${id}-ajuda`;
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="min-w-0 flex-1">
        <p id={tituloId} className="font-bold">
          <label htmlFor={`${id}-input`} className="cursor-pointer">
            {titulo}
          </label>
        </p>
        <p id={ajudaId} className="text-sm text-ink-2">
          {ajuda}
        </p>
      </div>
      <Switch.Root
        id={`${id}-input`}
        checked={checked}
        onCheckedChange={(v) => onChange(v)}
        aria-labelledby={tituloId}
        aria-describedby={ajudaId}
        className={cn(
          "group relative flex h-11 w-14 shrink-0 cursor-pointer items-center rounded-full outline-none",
          "focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        )}
      >
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 h-7 -translate-y-1/2 rounded-full bg-track transition-colors duration-(--duration-base) group-data-[checked]:bg-primary motion-reduce:transition-none"
        />
        <Switch.Thumb className="relative ml-1 size-5 rounded-full bg-card shadow-card transition-transform duration-(--duration-base) ease-out-expo data-[checked]:translate-x-7 motion-reduce:transition-none" />
      </Switch.Root>
    </div>
  );
}

interface LinhaItemProps {
  item: ItemGrupo;
  grupoNome: string;
  /** o que cabe neste item: o pote menos os outros itens */
  maximo: number;
  onNome: (nome: string) => void;
  onValor: (valor: number) => void;
  onRemover: () => void;
}

function LinhaItem({ item, grupoNome, maximo, onNome, onValor, onRemover }: LinhaItemProps) {
  const nome = item.nome.trim() || "essa linha";
  return (
    // a linha inteira mostra o foco (os campos sm não têm caixa própria)
    <div className="flex min-w-0 items-center gap-2 rounded-md border-t py-1 transition-[border-color,box-shadow] duration-(--duration-base) focus-within:border-ring focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-card motion-reduce:transition-none">
      <label htmlFor={idNomeItem(item.id)} className="sr-only">
        O que é, dentro de {grupoNome}
      </label>
      <input
        id={idNomeItem(item.id)}
        type="text"
        maxLength={40}
        placeholder="O que é"
        value={item.nome}
        onChange={(e) => onNome(e.target.value)}
        className="w-0 min-w-0 flex-1 bg-transparent font-bold outline-none placeholder:font-normal placeholder:text-ink-3"
      />
      <MoneyInput
        id={idValorItem(item.id)}
        label={`Quanto vai pra ${nome}`}
        hideLabel
        size="sm"
        value={item.valor}
        // limitado ao que cabe no pote: a soma dos itens nunca passa dele
        onChange={(v) => onValor(Math.min(Math.max(0, v ?? 0), maximo))}
        className="w-32 shrink-0"
      />
      <IconButton label={`Remover ${nome}`} icon={X} onClick={onRemover} />
    </div>
  );
}

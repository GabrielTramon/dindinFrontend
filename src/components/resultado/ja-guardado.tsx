"use client";

import { Ellipsis, Landmark, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useRef, useState } from "react";
import { ctaClasses } from "@/components/layout/cta-link";
import { ITEM } from "@/components/motion/springs";
import { GuardadoNaMetaPergunta } from "@/components/onboarding/guardado-na-meta";
import { MoneyInput } from "@/components/onboarding/money-input";
import { Drawer } from "@/components/ui/drawer";
import { TextField } from "@/components/ui/text-field";
import {
  MAX_GUARDADOS_NA_META,
  opcoesGuardadoNaMeta,
  rotuloMeta,
  totalGuardadoNaMeta,
  type GuardadoNaMeta,
  type Grupo,
  type Meta,
  type Perfil,
  type Plano,
} from "@/domain";
import { formatBRL, formatPct } from "@/lib/format";
import { STORAGE_KEYS, writeJSON } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { novoId } from "./pote-comum";
import { Rendimento } from "./pote-linha";

/*
  "Já guardado pra {meta}": o que a pessoa JÁ tinha guardado e pôs na meta, em
  potes (CDB, poupança…), cada um com o valor e o "Rende x% ao mês" + lápis.

  É estoque, não fluxo: fica fora do "Divida o que sobra" (que é o 100% do mês).
  Mora em Perfil.meta.guardados, então toda edição regrava o perfil — e o plano
  se refaz: o que vai pra meta sai da reserva, e o prazo da meta parte daqui.

  Só aparece pra quem tem meta e algo guardado.
*/

const NOME_VAZIO = "Pote sem nome";

const idPoteGuardado = (id: string) => `guardado-${id}`;

/** O pote do já guardado no formato que o selo de rendimento entende (ele sempre conta na meta). */
function comoGrupo(g: GuardadoNaMeta): Grupo {
  return {
    id: idPoteGuardado(g.id),
    nome: g.nome,
    icone: "Landmark",
    valor: g.valor,
    contaParaMeta: true,
    itens: [],
    ...(g.rendimentoMensal !== undefined ? { rendimentoMensal: g.rendimentoMensal } : {}),
  };
}

export function JaGuardado({ plano, perfil }: { plano: Plano; perfil: Perfil }) {
  const meta = perfil.meta;
  if (!meta || !(perfil.guardado > 0) || plano.modoCorte) return null;
  return <ConteudoJaGuardado plano={plano} perfil={perfil} meta={meta} />;
}

function ConteudoJaGuardado({ plano, perfil, meta }: { plano: Plano; perfil: Perfil; meta: Meta }) {
  const [escolhendo, setEscolhendo] = useState(false);
  const [aberto, setAberto] = useState<{ id: string; focarNome: boolean } | null>(null);
  const [gavetaPote, setGavetaPote] = useState(false);
  const [anuncio, setAnuncio] = useState("");
  const botaoMudar = useRef<HTMLButtonElement>(null);

  const nomeMeta = rotuloMeta(meta);
  const opcoes = opcoesGuardadoNaMeta(plano);
  const guardados = meta.guardados ?? [];
  const total = Math.min(totalGuardadoNaMeta(meta), perfil.guardado);
  const reserva = Math.max(0, perfil.guardado - total);
  const poteAberto = aberto ? (guardados.find((g) => g.id === aberto.id) ?? null) : null;

  function salvar(novos: GuardadoNaMeta[] | undefined) {
    const novaMeta: Meta = { ...meta };
    if (novos === undefined) delete novaMeta.guardados;
    else novaMeta.guardados = novos;
    writeJSON(STORAGE_KEYS.perfil, { ...perfil, meta: novaMeta });
  }

  function trocar(id: string, patch: Partial<GuardadoNaMeta>) {
    salvar(
      guardados.map((g) => {
        if (g.id !== id) return g;
        const novo = { ...g, ...patch };
        // chave ausente, nunca `undefined`: é o que o schema e a API esperam
        if ("rendimentoMensal" in patch && patch.rendimentoMensal === undefined) delete novo.rendimentoMensal;
        return novo;
      }),
    );
  }

  function dividir() {
    if (guardados.length >= MAX_GUARDADOS_NA_META) return;
    const id = novoId();
    salvar([...guardados, { id, nome: "", valor: 0 }]);
    setAberto({ id, focarNome: true });
    setGavetaPote(true);
  }

  function remover(id: string) {
    const removido = guardados.find((g) => g.id === id);
    salvar(guardados.filter((g) => g.id !== id));
    setGavetaPote(false);
    if (removido) setAnuncio(`${removido.nome.trim() || NOME_VAZIO} removido. ${formatBRL(removido.valor)} voltaram pra reserva.`);
  }

  const cheio = guardados.length >= MAX_GUARDADOS_NA_META;
  const comValor = guardados.filter((g) => g.valor > 0 || guardados.length > 1);

  return (
    <section aria-labelledby="ja-guardado-titulo" className="min-w-0">
      <h2 id="ja-guardado-titulo" className="eyebrow">
        Já guardado pra {nomeMeta}
      </h2>

      {total > 0 ? (
        <>
          <p className="mt-2 font-bold text-pretty tnum">
            {formatBRL(total)} dos {formatBRL(perfil.guardado)} que você tem vão pra {nomeMeta}
          </p>
          <p className="mt-1 text-sm text-ink-2 tnum">
            {reserva > 0
              ? `${formatBRL(reserva)} ficam de reserva. Cada pote rende do jeito dele: o prazo da meta já conta com isso.`
              : "Nada ficou de reserva: o plano junta ela de novo antes de ir pra meta."}
          </p>

          <ul className="mt-2 min-w-0 divide-y divide-border">
            <AnimatePresence initial={false}>
              {comValor.map((g) => {
                const nome = g.nome.trim() || NOME_VAZIO;
                return (
                  <m.li key={g.id} layout="position" variants={ITEM} initial="initial" animate="animate" exit="exit">
                    <div role="group" aria-label={`Pote ${nome}`} className="min-w-0 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full bg-primary" />
                        <Landmark aria-hidden="true" className="hidden size-5 shrink-0 text-ink-2 sm:block" />
                        <p className="min-w-0 flex-1 truncate font-bold">{nome}</p>
                        <p className="shrink-0 text-lg font-extrabold tnum">{formatBRL(g.valor)}</p>
                        <button
                          type="button"
                          id={`${idPoteGuardado(g.id)}-opcoes`}
                          aria-label={`Opções do pote ${nome}`}
                          onClick={() => {
                            setAberto({ id: g.id, focarNome: false });
                            setGavetaPote(true);
                          }}
                          className="press flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <Ellipsis aria-hidden="true" className="size-5" />
                        </button>
                      </div>
                      <Rendimento
                        grupo={comoGrupo(g)}
                        nome={nome}
                        nomeMeta={nomeMeta}
                        degrauDeMetas
                        onRendimento={(rendimentoMensal) => {
                          trocar(g.id, { rendimentoMensal });
                          setAnuncio(
                            rendimentoMensal === undefined
                              ? `${nome} não rende mais.`
                              : `${nome} rende ${formatPct(rendimentoMensal, 2)} ao mês.`,
                          );
                        }}
                      />
                    </div>
                  </m.li>
                );
              })}
            </AnimatePresence>
          </ul>

          <div className="mt-3 grid min-w-0 gap-2 sm:flex sm:items-center">
            <button
              type="button"
              onClick={dividir}
              disabled={cheio}
              className="press flex h-13 w-full min-w-0 items-center sm:flex-1 justify-center gap-2 rounded-2xl border border-dashed border-border-strong px-4 text-sm font-bold text-ink-2 outline-none hover:border-primary hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
            >
              <Plus aria-hidden="true" className="size-4" />
              Dividir em outro investimento
            </button>
            <button
              ref={botaoMudar}
              type="button"
              onClick={() => setEscolhendo(true)}
              className={cn(ctaClasses("ghost", "md"), "justify-self-start")}
            >
              Mudar quanto vai pra meta
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm text-pretty text-ink-2 tnum">
            Você tem {formatBRL(perfil.guardado)} guardados e nada disso está indo pra {nomeMeta}: a meta começa do zero.
            {opcoes.excedente > 0 && ` ${formatBRL(opcoes.excedente)} passam da sua reserva e podiam ir pra ela.`}
          </p>
          <button
            ref={botaoMudar}
            type="button"
            onClick={() => setEscolhendo(true)}
            className={cn(ctaClasses("secondary", "md"), "mt-3")}
          >
            Usar o que já tenho na meta
          </button>
        </>
      )}

      <p aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      <Drawer
        open={escolhendo}
        onOpenChange={setEscolhendo}
        title={`O que você já tem entra na meta ${nomeMeta}?`}
        finalFocus={() => botaoMudar.current ?? true}
      >
        <div className="grid min-w-0 gap-5">
          <GuardadoNaMetaPergunta
            id="plano-guardado"
            nomeMeta={nomeMeta}
            opcoes={opcoes}
            guardados={meta.guardados}
            onChange={(novos) => salvar(novos)}
            novoId={novoId}
            perguntaVisivel={false}
          />
          <button
            type="button"
            onClick={() => setEscolhendo(false)}
            className={cn(ctaClasses("primary", "lg"), "w-full sm:w-auto sm:justify-self-start")}
          >
            Pronto
          </button>
        </div>
      </Drawer>

      <Drawer
        open={gavetaPote && poteAberto !== null}
        onOpenChange={setGavetaPote}
        onOpenChangeComplete={(abriu) => {
          if (!abriu) setAberto(null);
        }}
        initialFocus={
          aberto?.focarNome && poteAberto ? () => document.getElementById(`${idPoteGuardado(poteAberto.id)}-nome`) ?? true : undefined
        }
        finalFocus={() => {
          const el = poteAberto ? document.getElementById(`${idPoteGuardado(poteAberto.id)}-opcoes`) : null;
          return el ?? botaoMudar.current ?? true;
        }}
        title={poteAberto ? `Pote ${poteAberto.nome.trim() || NOME_VAZIO}` : "Pote"}
      >
        {poteAberto && (
          <OpcoesDoPoteGuardado
            key={poteAberto.id}
            pote={poteAberto}
            maximo={Math.max(0, perfil.guardado - (total - Math.min(poteAberto.valor, total)))}
            nomeMeta={nomeMeta}
            onTrocar={(patch) => trocar(poteAberto.id, patch)}
            onRemover={() => remover(poteAberto.id)}
          />
        )}
      </Drawer>
    </section>
  );
}

interface OpcoesDoPoteGuardadoProps {
  pote: GuardadoNaMeta;
  /** o máximo que cabe neste pote: o guardado menos os outros potes */
  maximo: number;
  nomeMeta: string;
  onTrocar: (patch: Partial<GuardadoNaMeta>) => void;
  onRemover: () => void;
}

function OpcoesDoPoteGuardado({ pote, maximo, nomeMeta, onTrocar, onRemover }: OpcoesDoPoteGuardadoProps) {
  const id = idPoteGuardado(pote.id);
  return (
    <div className="grid min-w-0 gap-5">
      <TextField
        id={`${id}-nome`}
        label="Onde está esse dinheiro"
        maxLength={40}
        placeholder="Ex.: CDB, poupança, Tesouro"
        value={pote.nome}
        onChange={(e) => onTrocar({ nome: e.target.value })}
      />
      <div className="grid min-w-0 gap-1.5">
        <MoneyInput
          id={`${id}-valor`}
          label={`Quanto tem aí pra ${nomeMeta}`}
          size="md"
          value={pote.valor}
          // nunca mais do que ela tem guardado, contando os outros potes
          onChange={(v) => onTrocar({ valor: Math.min(Math.max(0, v ?? 0), maximo) })}
        />
        <p className="text-sm text-ink-2 tnum">
          Até {formatBRL(maximo)}: é o que você tem guardado fora dos outros potes. O que não for pra meta fica de reserva.
        </p>
      </div>
      <div className="border-t pt-4">
        <button type="button" onClick={onRemover} className={cn(ctaClasses("ghost", "md"), "-ml-2 text-warn hover:text-warn")}>
          <Trash2 aria-hidden="true" className="size-4" />
          Remover pote
        </button>
      </div>
    </div>
  );
}

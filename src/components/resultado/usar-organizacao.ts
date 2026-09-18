"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import {
  grupoSugeridoPorSlug,
  organizarExcedente,
  SLUG_GRUPO_SISTEMA,
  type Grupo,
  type Organizacao,
  type Plano,
} from "@/domain";
import { arredondar } from "@/lib/format";
import { readJSON, STORAGE_KEYS, subscribeStorage, writeJSON } from "@/lib/storage";

/*
  O estado da seção "como organizar o que sobra".

  Os grupos moram numa chave própria do localStorage — fora do perfil, que é
  revalidado inteiro a cada render: uma árvore estranha não pode derrubar o
  plano da tela.

  O grupo do sistema ("Guardar") não é gravado como os outros: o valor dele é o
  aporte do plano, e só vira dado quando a pessoa edita. Assim, mudar o ritmo ou
  qualquer resposta do questionário atualiza o "Guardar" sozinho, sem deixar um
  número velho gravado.

  O que a pessoa escreve DENTRO dele — itens, "entra na minha meta", rendimento —
  é dado dela e precisa ser gravado à parte, senão some no primeiro redesenho:
  `montarSistema` e `paraGuardado` são os dois lados desse mesmo contrato e
  mudam sempre juntos.
*/

export interface Guardado {
  /** grupos da pessoa, sem o do sistema */
  grupos: Grupo[];
  /** itens que ela criou dentro do "Guardar" */
  itensDoSistema?: Grupo["itens"];
  /**
   * "entra na minha meta" do grupo do sistema quando a pessoa mexeu na caixinha.
   * Ausente = o padrão, que é contar só no degrau de metas: antes disso esse
   * dinheiro vai pro fôlego, pra dívida ou pra reserva, e prometer que virou
   * meta seria mentira.
   */
  sistemaContaParaMeta?: boolean;
  /**
   * o rendimento declarado no "Guardar". O VALOR desse grupo é do plano e se
   * refaz a cada render; a taxa, não — sem gravar aqui, o que a pessoa digita
   * some no primeiro redesenho e nunca chega na projeção da meta.
   */
  rendimentoDoSistema?: number;
}

const VAZIO: Guardado = { grupos: [] };

function ler(): Guardado {
  const bruto = readJSON<unknown>(STORAGE_KEYS.organizacao, null);
  if (typeof bruto !== "object" || bruto === null) return VAZIO;
  const o = bruto as Record<string, unknown>;
  return {
    grupos: Array.isArray(o.grupos) ? (o.grupos as Grupo[]) : [],
    itensDoSistema: Array.isArray(o.itensDoSistema) ? (o.itensDoSistema as Grupo["itens"]) : undefined,
    sistemaContaParaMeta: typeof o.sistemaContaParaMeta === "boolean" ? o.sistemaContaParaMeta : undefined,
    rendimentoDoSistema:
      typeof o.rendimentoDoSistema === "number" && Number.isFinite(o.rendimentoDoSistema) && o.rendimentoDoSistema > 0
        ? o.rendimentoDoSistema
        : undefined,
  };
}

/** leitura estável pro useSyncExternalStore: string, não objeto novo a cada render */
function snapshot(): string {
  return JSON.stringify(readJSON<unknown>(STORAGE_KEYS.organizacao, null));
}

const SUGESTAO_SISTEMA = grupoSugeridoPorSlug(SLUG_GRUPO_SISTEMA);

/**
 * O "Guardar" montado: valor vindo do plano, o resto vindo do que está gravado.
 *
 * `degrauDeMetas` é `plano.degrau === 4` — o dinheiro do plano só é "pra meta"
 * quando a cascata chegou lá; antes disso ele vai pro fôlego, pra dívida ou pra
 * reserva.
 */
export function montarSistema(guardado: Guardado, aporte: number, degrauDeMetas: boolean): Grupo {
  return {
    id: SLUG_GRUPO_SISTEMA,
    nome: SUGESTAO_SISTEMA?.nome ?? "Guardar",
    icone: SUGESTAO_SISTEMA?.icone ?? "PiggyBank",
    valor: aporte,
    contaParaMeta: guardado.sistemaContaParaMeta ?? degrauDeMetas,
    doSistema: true,
    itens: guardado.itensDoSistema ?? [],
    // chave ausente quando não há taxa: é o que faz o campo aparecer vazio, em
    // vez de um 0% que ninguém digitou
    ...(guardado.rendimentoDoSistema !== undefined
      ? { rendimentoMensal: guardado.rendimentoDoSistema }
      : {}),
  };
}

/**
 * O caminho de volta: a lista que a tela devolveu vira o que vai pro
 * localStorage. O valor do "Guardar" fica de fora de propósito (ele é o aporte
 * do plano, e mora no perfil quando ela escolhe um a dedo).
 */
export function paraGuardado(anterior: Guardado, lista: Grupo[], degrauDeMetas: boolean): Guardado {
  const sistema = lista.find((g) => g.doSistema);
  return {
    ...anterior,
    grupos: lista.filter((g) => !g.doSistema),
    itensDoSistema: sistema?.itens?.length ? sistema.itens : undefined,
    // só grava quando difere do padrão: assim o dia em que a cascata chegar nas
    // metas a caixinha acompanha sozinha, pra quem nunca mexeu nela
    sistemaContaParaMeta:
      sistema !== undefined && sistema.contaParaMeta !== degrauDeMetas ? sistema.contaParaMeta : undefined,
    // o valor do "Guardar" é do plano, mas a taxa é dela: sem esta linha o
    // rendimento digitado aqui some no redesenho seguinte e nunca entra na
    // projeção. `undefined` some do JSON — que é o que desligar a caixinha faz
    rendimentoDoSistema: sistema?.rendimentoMensal,
  };
}

export interface UsoDaOrganizacao {
  /** a lista completa, com o grupo do sistema na frente */
  grupos: Grupo[];
  organizacao: Organizacao;
  /** o que o plano guarda este mês, já considerando uma edição da pessoa */
  aporte: number;
  /** true quando ela mexeu no "Guardar" — o ritmo vira "personalizado" */
  aporteEditado: boolean;
  salvarGrupos: (grupos: Grupo[]) => void;
  /** grava o novo valor do "Guardar"; undefined volta pro que o plano sugere */
  escolherAporte: (valor: number | undefined) => void;
  limpar: () => void;
}

export function usarOrganizacao(plano: Plano): UsoDaOrganizacao {
  const serializado = useSyncExternalStore(subscribeStorage, snapshot, () => "null");
  // o storage é a fonte; o estado local só existe pro caso de gravação bloqueada
  const [fallback, setFallback] = useState<Guardado | null>(null);

  const guardado = useMemo<Guardado>(() => {
    if (serializado === "null" || serializado === undefined) return fallback ?? VAZIO;
    return ler();
    // serializado muda a cada escrita: é ele que dispara a releitura
  }, [serializado, fallback]);

  const base = plano.resumo.excedente;
  // o valor do "Guardar" escolhido a dedo é decisão sobre o PLANO, não sobre a
  // organização: mora no perfil, viaja com ele e já chega no motor
  const aporteEditado = plano.perfil.aporteEscolhido !== undefined;
  const aporte = arredondar(Math.min(Math.max(0, plano.aporte), Math.max(0, base)));

  const grupos = useMemo<Grupo[]>(
    () => [montarSistema(guardado, aporte, plano.degrau === 4), ...guardado.grupos],
    [guardado, aporte, plano.degrau],
  );

  const organizacao = useMemo(() => organizarExcedente(base, grupos), [base, grupos]);

  const gravar = useCallback((novo: Guardado) => {
    if (!writeJSON(STORAGE_KEYS.organizacao, novo)) setFallback(novo);
  }, []);

  const salvarGrupos = useCallback(
    (lista: Grupo[]) => {
      gravar(paraGuardado(ler(), lista, plano.degrau === 4));
    },
    [gravar, plano.degrau],
  );

  const escolherAporte = useCallback(
    (valor: number | undefined) => {
      const { aporteEscolhido: _antigo, ...resto } = plano.perfil;
      // chave ausente, nunca `undefined`: é o que mantém o perfil idêntico ao
      // de quem nunca editou (e o plano gravado sem versão nova à toa)
      writeJSON(STORAGE_KEYS.perfil, valor === undefined ? resto : { ...resto, aporteEscolhido: valor });
    },
    [plano.perfil],
  );

  const limpar = useCallback(() => gravar(VAZIO), [gravar]);

  return { grupos, organizacao, aporte, aporteEditado, salvarGrupos, escolherAporte, limpar };
}

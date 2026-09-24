"use client";

/*
  eslint: o hook se chama `usarOrganizacao` (domínio em pt-BR, como o resto do
  app) e a regra rules-of-hooks só reconhece o prefixo `use`. É um hook de
  verdade (chamado no topo de PlanoCompleto); sem React Compiler no projeto, o
  nome não muda o comportamento. Renomear pra `useOrganizacao` é decisão do dono.
*/
/* eslint-disable react-hooks/rules-of-hooks */

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import {
  ajustarProporcionalmente,
  grupoSugeridoPorSlug,
  limitesDoDivisor,
  organizarExcedente,
  reescalarGrupos,
  SLUG_GRUPO_SISTEMA,
  type Grupo,
  type LimitesDoDivisor,
  type Organizacao,
  type Plano,
} from "@/domain";
import { arredondar } from "@/lib/format";
import { readJSON, STORAGE_KEYS, subscribeStorage, writeJSON } from "@/lib/storage";
import { itensPassamDe, poteComValor } from "./pote-comum";

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

  Em PORCENTAGEM: os potes continuam gravados em reais, mas junto vai a
  `baseReferencia` — a sobra do mês no momento da gravação. Na leitura, se a
  sobra mudou (aumento de salário, conta nova), os potes são reescalados pra
  continuar sendo a MESMA % (reescalarGrupos). Sem `baseReferencia` (dado
  gravado antes disso) nada é reescalado: vale a base atual. A próxima gravação
  já regrava com a base nova. Nada é reescrito durante o render.
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
  /**
   * a sobra do mês (excedente) quando os potes foram gravados. É o que deixa a
   * divisão ser em %: com a sobra nova, os potes voltam na mesma proporção.
   * Ausente = dado antigo, que vale como está sobre a base atual.
   */
  baseReferencia?: number;
}

const VAZIO: Guardado = { grupos: [] };

const numeroPositivo = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : undefined;

/** O que está no localStorage virando um Guardado; lixo vira o vazio. Puro. */
export function interpretarGuardado(bruto: unknown): Guardado {
  if (typeof bruto !== "object" || bruto === null) return VAZIO;
  const o = bruto as Record<string, unknown>;
  return {
    grupos: Array.isArray(o.grupos) ? (o.grupos as Grupo[]) : [],
    itensDoSistema: Array.isArray(o.itensDoSistema) ? (o.itensDoSistema as Grupo["itens"]) : undefined,
    sistemaContaParaMeta: typeof o.sistemaContaParaMeta === "boolean" ? o.sistemaContaParaMeta : undefined,
    rendimentoDoSistema: numeroPositivo(o.rendimentoDoSistema),
    baseReferencia: numeroPositivo(o.baseReferencia),
  };
}

function ler(): Guardado {
  return interpretarGuardado(readJSON<unknown>(STORAGE_KEYS.organizacao, null));
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
 *
 * Os itens gravados nunca passam do aporte de hoje: quando o plano guarda menos
 * do que eles somam (ritmo trocado, respostas refeitas), a tela os mostra
 * encolhidos na proporção. O que está gravado só muda na próxima gravação.
 */
export function montarSistema(guardado: Guardado, aporte: number, degrauDeMetas: boolean): Grupo {
  const sistema: Grupo = {
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
  if (!itensPassamDe(sistema, aporte)) return sistema;
  // só os itens encolhem: o valor continua sendo o aporte do plano, sem arredondar nada
  return { ...sistema, itens: poteComValor(sistema, aporte).itens };
}

/**
 * A lista inteira que a tela usa: o "Guardar" na frente e os potes da pessoa
 * já reescalados pra sobra de hoje (a mesma % de quando foram gravados).
 */
export function montarGrupos(guardado: Guardado, aporte: number, degrauDeMetas: boolean, base: number): Grupo[] {
  return [
    montarSistema(guardado, aporte, degrauDeMetas),
    ...reescalarGrupos(guardado.grupos, guardado.baseReferencia, base),
  ];
}

/**
 * O caminho de volta: a lista que a tela devolveu vira o que vai pro
 * localStorage. O valor do "Guardar" fica de fora de propósito (ele é o aporte
 * do plano, e mora no perfil quando ela escolhe um a dedo).
 *
 * `base` é a sobra de hoje: vira a `baseReferencia` dos potes gravados. Sem
 * base positiva (corte), a referência anterior fica como estava.
 */
export function paraGuardado(anterior: Guardado, lista: Grupo[], degrauDeMetas: boolean, base?: number): Guardado {
  const sistema = lista.find((g) => g.doSistema);
  const baseReferencia =
    base !== undefined && Number.isFinite(base) && base > 0 ? arredondar(base) : anterior.baseReferencia;
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
    baseReferencia,
  };
}

export interface UsoDaOrganizacao {
  /** a lista completa, com o grupo do sistema na frente */
  grupos: Grupo[];
  organizacao: Organizacao;
  /** o que o plano guarda este mês, já considerando uma edição da pessoa (nunca acima da sobra) */
  aporte: number;
  /** a sobra do mês (excedente): o 100% do divisor */
  base: number;
  /** o que fica "Pra você" e quanto cada pote ainda pode crescer */
  limites: LimitesDoDivisor;
  /** true quando ela mexeu no "Guardar" — o ritmo vira "personalizado" */
  aporteEditado: boolean;
  salvarGrupos: (grupos: Grupo[]) => void;
  /** grava o novo valor do "Guardar"; undefined volta pro que o plano sugere */
  escolherAporte: (valor: number | undefined) => void;
  /** dado antigo acima da sobra: reparte a sobra na proporção dos potes ("Guardar" junto) */
  ajustar: () => void;
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
  // o motor já limita a escolha à mão à sobra (aportePorDegrau)
  const aporte = plano.aporte;

  const grupos = useMemo<Grupo[]>(
    () => montarGrupos(guardado, aporte, plano.degrau === 4, base),
    [guardado, aporte, plano.degrau, base],
  );

  const organizacao = useMemo(() => organizarExcedente(base, grupos), [base, grupos]);
  const limites = useMemo(() => limitesDoDivisor(plano, grupos), [plano, grupos]);

  const gravar = useCallback((novo: Guardado) => {
    if (!writeJSON(STORAGE_KEYS.organizacao, novo)) setFallback(novo);
  }, []);

  const salvarGrupos = useCallback(
    (lista: Grupo[]) => {
      gravar(paraGuardado(ler(), lista, plano.degrau === 4, base));
    },
    [gravar, plano.degrau, base],
  );

  const escolherAporte = useCallback(
    (valor: number | undefined) => {
      const resto = { ...plano.perfil };
      delete resto.aporteEscolhido;
      // chave ausente, nunca `undefined`: é o que mantém o perfil idêntico ao
      // de quem nunca editou (e o plano gravado sem versão nova à toa)
      writeJSON(STORAGE_KEYS.perfil, valor === undefined ? resto : { ...resto, aporteEscolhido: valor });
    },
    [plano.perfil],
  );

  const ajustar = useCallback(() => {
    const ajustados = ajustarProporcionalmente(base, grupos);
    salvarGrupos(ajustados);
    const sistema = ajustados.find((g) => g.doSistema);
    // o ajuste também encolhe o "Guardar", e esse valor mora no perfil
    if (sistema && Math.round(sistema.valor * 100) !== Math.round(aporte * 100)) escolherAporte(sistema.valor);
  }, [grupos, base, salvarGrupos, escolherAporte, aporte]);

  const limpar = useCallback(() => gravar(VAZIO), [gravar]);

  return {
    grupos,
    organizacao,
    aporte,
    base,
    limites,
    aporteEditado,
    salvarGrupos,
    escolherAporte,
    ajustar,
    limpar,
  };
}

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
*/

interface Guardado {
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
  };
}

/** leitura estável pro useSyncExternalStore: string, não objeto novo a cada render */
function snapshot(): string {
  return JSON.stringify(readJSON<unknown>(STORAGE_KEYS.organizacao, null));
}

const SUGESTAO_SISTEMA = grupoSugeridoPorSlug(SLUG_GRUPO_SISTEMA);

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

  const grupos = useMemo<Grupo[]>(() => {
    const sistema: Grupo = {
      id: SLUG_GRUPO_SISTEMA,
      nome: SUGESTAO_SISTEMA?.nome ?? "Guardar",
      icone: SUGESTAO_SISTEMA?.icone ?? "PiggyBank",
      valor: aporte,
      // o dinheiro do plano só é "pra meta" quando a cascata chegou nas metas:
      // antes disso ele vai pro fôlego, pra dívida ou pra reserva
      contaParaMeta: guardado.sistemaContaParaMeta ?? plano.degrau === 4,
      doSistema: true,
      itens: guardado.itensDoSistema ?? [],
    };
    return [sistema, ...guardado.grupos];
  }, [aporte, plano.degrau, guardado.grupos, guardado.itensDoSistema, guardado.sistemaContaParaMeta]);

  const organizacao = useMemo(() => organizarExcedente(base, grupos), [base, grupos]);

  const gravar = useCallback((novo: Guardado) => {
    if (!writeJSON(STORAGE_KEYS.organizacao, novo)) setFallback(novo);
  }, []);

  const salvarGrupos = useCallback(
    (lista: Grupo[]) => {
      const sistema = lista.find((g) => g.doSistema);
      const padrao = plano.degrau === 4;
      gravar({
        ...ler(),
        grupos: lista.filter((g) => !g.doSistema),
        itensDoSistema: sistema?.itens?.length ? sistema.itens : undefined,
        // só grava quando difere do padrão: assim o dia em que a cascata chegar
        // nas metas a caixinha acompanha sozinha, pra quem nunca mexeu nela
        sistemaContaParaMeta:
          sistema !== undefined && sistema.contaParaMeta !== padrao ? sistema.contaParaMeta : undefined,
      });
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

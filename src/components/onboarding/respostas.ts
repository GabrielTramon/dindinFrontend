import {
  MAX_DIVIDAS,
  MORADIAS,
  MORADIAS_SEM_CUSTO,
  TIPOS_DIVIDA,
  TIPOS_RENDA,
  type Moradia,
  type PerfilInput,
  type TipoDivida,
} from "@/domain";
import { readJSON, STORAGE_KEYS } from "@/lib/storage";

/*
  O estado do onboarding enquanto a pessoa responde. É um Perfil com buracos:
  campos ainda não respondidos ficam undefined, e uma dívida pode estar sem
  tipo ou sem saldo até ela terminar de preencher.
*/

/** Uma dívida ainda sendo preenchida: tipo e saldo podem faltar. */
export interface DividaRascunho {
  tipo?: TipoDivida;
  saldo?: number;
  parcela?: number;
}

/**
 * Respostas parciais. `dividas` tem três estados:
 * undefined (não respondeu), [] ("não devo nada") e lista (tem dívida).
 */
export type Respostas = Omit<Partial<PerfilInput>, "dividas"> & {
  dividas?: DividaRascunho[];
};

export function moradiaSemCusto(moradia: Moradia | undefined): boolean {
  return moradia !== undefined && (MORADIAS_SEM_CUSTO as readonly Moradia[]).includes(moradia);
}

function numero(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function entre<T extends string>(lista: readonly T[], v: unknown): T | undefined {
  return typeof v === "string" && (lista as readonly string[]).includes(v) ? (v as T) : undefined;
}

function dividasDe(v: unknown): DividaRascunho[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.slice(0, MAX_DIVIDAS).map((item: unknown) => {
    const d = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
    return { tipo: entre(TIPOS_DIVIDA, d.tipo), saldo: numero(d.saldo), parcela: numero(d.parcela) };
  });
}

/** O que vem do localStorage é de outra sessão, talvez de outra versão: só entra o que faz sentido. */
export function sanearRespostas(bruto: unknown): Respostas {
  if (typeof bruto !== "object" || bruto === null) return {};
  const o = bruto as Record<string, unknown>;
  return {
    rendaMensal: numero(o.rendaMensal),
    tipoRenda: entre(TIPOS_RENDA, o.tipoRenda),
    idade: numero(o.idade),
    moradia: entre(MORADIAS, o.moradia),
    custoMoradia: numero(o.custoMoradia),
    custoFixo: numero(o.custoFixo),
    dividas: dividasDe(o.dividas),
    guardado: numero(o.guardado),
  };
}

export interface RespostasSalvas {
  respostas: Respostas;
  /** true quando veio do rascunho (respostas em andamento), não do perfil já salvo */
  emAndamento: boolean;
}

/** Rascunho em andamento; sem rascunho, o perfil já salvo — é o que faz "ajustar respostas" funcionar. */
export function lerRespostasSalvas(): RespostasSalvas {
  const rascunho = readJSON<unknown>(STORAGE_KEYS.rascunho, null);
  if (rascunho !== null) return { respostas: sanearRespostas(rascunho), emAndamento: true };
  return { respostas: sanearRespostas(readJSON<unknown>(STORAGE_KEYS.perfil, null)), emAndamento: false };
}

/** Objeto pronto pra `validarPerfil`: moradia sem custo zera o custo de moradia. */
export function montarPerfil(r: Respostas): Respostas {
  return { ...r, custoMoradia: moradiaSemCusto(r.moradia) ? 0 : r.custoMoradia };
}

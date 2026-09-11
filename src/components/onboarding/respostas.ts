import {
  MAX_DIVIDAS,
  MAX_GASTOS_FIXOS,
  MORADIAS,
  MORADIAS_SEM_CUSTO,
  SLUGS_CATEGORIA,
  SLUG_OUTRO,
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

/** Um gasto fixo ainda sendo preenchido: o valor (e o nome, quando livre) podem faltar. */
export interface GastoRascunho {
  categoria: string;
  nome?: string;
  valor?: number;
}

/**
 * Respostas parciais. `dividas` e `gastosFixos` têm três estados cada:
 * undefined (não respondeu), [] ("não tenho") e lista preenchida.
 */
export type Respostas = Omit<Partial<PerfilInput>, "dividas" | "gastosFixos"> & {
  dividas?: DividaRascunho[];
  gastosFixos?: GastoRascunho[];
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

function gastosDe(v: unknown): GastoRascunho[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v
    .slice(0, MAX_GASTOS_FIXOS)
    .map((item: unknown): GastoRascunho | null => {
      const g = typeof item === "object" && item !== null ? (item as Record<string, unknown>) : {};
      const categoria = entre(SLUGS_CATEGORIA, g.categoria);
      const nome = typeof g.nome === "string" ? g.nome.slice(0, 40) : undefined;
      return categoria === undefined ? null : { categoria, nome, valor: numero(g.valor) };
    })
    // categoria desconhecida: catálogo mudou desde que a pessoa respondeu — a linha some
    .filter((g): g is GastoRascunho => g !== null);
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
    gastosFixos: gastosDe(o.gastosFixos),
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

/**
 * Objeto pronto pra `validarPerfil`: moradia sem custo zera o custo de moradia,
 * e o nome em branco de uma categoria livre vira ausente (o schema cobra).
 */
export function montarPerfil(r: Respostas): Respostas {
  return {
    ...r,
    custoMoradia: moradiaSemCusto(r.moradia) ? 0 : r.custoMoradia,
    gastosFixos: r.gastosFixos?.map((g) => ({
      ...g,
      nome: g.categoria === SLUG_OUTRO ? g.nome?.trim() || undefined : undefined,
    })),
  };
}

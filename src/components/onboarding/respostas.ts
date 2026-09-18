import {
  brutoParaLiquido,
  MAX_DIVIDAS,
  MAX_GASTOS_FIXOS,
  METAS_TIPO,
  MORADIAS,
  MORADIAS_SEM_CUSTO,
  RENDAS_INFORMADAS,
  RITMOS,
  SLUGS_CATEGORIA,
  SLUG_OUTRO,
  TABELAS_FOLHA,
  TIPOS_DIVIDA,
  TIPOS_RENDA,
  type Holerite,
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

function metaDe(v: unknown): PerfilInput["meta"] | undefined {
  if (typeof v !== "object" || v === null) return undefined;
  const m = v as Record<string, unknown>;
  const tipo = entre(METAS_TIPO, m.tipo);
  if (tipo === undefined) return undefined;
  const nome = typeof m.nome === "string" ? m.nome.slice(0, 40) : undefined;
  const valorAlvo = numero(m.valorAlvo);
  // valorAlvo ainda não respondido é estado normal do rascunho; o schema cobra no fim
  return { tipo, nome, valorAlvo: valorAlvo as number };
}

/**
 * O que vem do localStorage é de outra sessão, talvez de outra versão: só entra
 * o que faz sentido.
 *
 * É uma allow-list: campo novo que esquecerem de listar aqui é apagado a cada
 * montagem do rascunho — a pessoa responde, troca de passo e o valor some.
 */
export function sanearRespostas(bruto: unknown): Respostas {
  if (typeof bruto !== "object" || bruto === null) return {};
  const o = bruto as Record<string, unknown>;
  return {
    rendaMensal: numero(o.rendaMensal),
    rendaInformada: entre(RENDAS_INFORMADAS, o.rendaInformada),
    salarioBruto: numero(o.salarioBruto),
    dependentes: numero(o.dependentes),
    competenciaTabela: typeof o.competenciaTabela === "string" ? o.competenciaTabela : undefined,
    ritmo: entre(RITMOS, o.ritmo),
    aporteEscolhido: numero(o.aporteEscolhido),
    meta: metaDe(o.meta),
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
 * O holerite estimado das respostas atuais, ou null quando a pessoa informou o
 * que cai na conta (PJ e informal sempre caem aqui: sem saber o anexo do Simples
 * e o Fator R, não existe conta honesta).
 *
 * É o mesmo cálculo da prévia do onboarding e o que preenche `rendaMensal`, pra
 * tela e plano nunca discordarem de um centavo.
 */
export function holeriteDasRespostas(r: Respostas): Holerite | null {
  if (r.rendaInformada !== "bruta" || r.salarioBruto === undefined) return null;
  return brutoParaLiquido(r.salarioBruto, { dependentes: r.dependentes });
}

/**
 * Objeto pronto pra `validarPerfil`: moradia sem custo zera o custo de moradia,
 * o nome em branco de uma categoria livre vira ausente (o schema cobra) e,
 * quem informou o salário bruto, tem `rendaMensal` derivada do líquido.
 */
export function montarPerfil(r: Respostas): Respostas {
  const holerite = holeriteDasRespostas(r);
  return {
    ...r,
    rendaMensal: holerite ? holerite.liquido : r.rendaMensal,
    // qual tabela gerou esse líquido: em janeiro dá pra avisar que a conta mudou
    competenciaTabela: holerite ? TABELAS_FOLHA.competencia : r.competenciaTabela,
    custoMoradia: moradiaSemCusto(r.moradia) ? 0 : r.custoMoradia,
    gastosFixos: r.gastosFixos?.map((g) => ({
      ...g,
      nome: g.categoria === SLUG_OUTRO ? g.nome?.trim() || undefined : undefined,
    })),
    meta: r.meta && { ...r.meta, nome: r.meta.tipo === "outro" ? r.meta.nome?.trim() || undefined : undefined },
  };
}

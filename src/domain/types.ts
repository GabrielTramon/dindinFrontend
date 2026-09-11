/*
  Tipos do domínio do dindin.
  Tudo aqui é puro: sem React, sem I/O, sem Next.
  Nomes em português porque são termos do produto (renda, reserva, degrau).
*/

export type TipoRenda = "clt" | "pj" | "informal";

export type Moradia = "pais" | "aluguel" | "dividido" | "propria" | "financiada";

export type TipoDivida =
  | "rotativo"
  | "cheque_especial"
  | "emprestimo"
  | "financiamento"
  | "outra";

export interface Divida {
  tipo: TipoDivida;
  /** saldo devedor total, em reais */
  saldo: number;
  /** parcela mensal já paga hoje, em reais (0 ou ausente se não há parcela fixa) */
  parcela?: number;
  /** taxa anual, ex.: 0.45 = 45% a.a.; ausente → usa o padrão do tipo em config.ts */
  taxaAnual?: number;
}

/** As 8 respostas do onboarding. */
export interface Perfil {
  /** renda líquida mensal, em reais */
  rendaMensal: number;
  tipoRenda: TipoRenda;
  idade: number;
  moradia: Moradia;
  /** aluguel ou parcela + condomínio; 0 quando mora com os pais ou casa quitada */
  custoMoradia: number;
  /** gastos fixos fora moradia: mercado, transporte, celular, assinaturas */
  custoFixo: number;
  dividas: Divida[];
  /** quanto já tem guardado hoje (poupança, conta rendendo) */
  guardado: number;
}

/**
 * Degrau da cascata em que a pessoa está:
 * 0 fôlego mínimo · 1 dívida cara · 2 reserva · 3 dívida média · 4 metas
 */
export type Degrau = 0 | 1 | 2 | 3 | 4;

export type ClasseDivida = "cara" | "media" | "barata";

export interface DividaAvaliada extends Divida {
  taxaAnual: number;
  classe: ClasseDivida;
  /** quanto essa dívida custa por mês só de juros, em reais */
  jurosMensais: number;
}

export type Destino =
  | "folego"
  | "divida_cara"
  | "reserva"
  | "divida_media"
  | "metas";

/** Uma fatia do aporte do mês indo para um degrau da cascata. */
export interface Alocacao {
  destino: Destino;
  valor: number;
  titulo: string;
  descricao: string;
}

export interface Resumo {
  renda: number;
  custoMoradia: number;
  custoFixo: number;
  /** soma das parcelas de dívida informadas */
  parcelas: number;
  custoTotal: number;
  /** renda − custoTotal; pode ser negativo */
  excedente: number;
  /** excedente / renda, entre −∞ e 1 */
  taxaExcedente: number;
}

export interface Folego {
  alvo: number;
  atual: number;
  falta: number;
  ok: boolean;
}

export interface Reserva {
  multiplicador: 3 | 6;
  alvo: number;
  atual: number;
  falta: number;
  ok: boolean;
  /** meses até completar com o aporte atual; null quando o aporte está indo pra outro degrau */
  mesesParaCompletar: number | null;
}

export interface QuadroDividas {
  avaliadas: DividaAvaliada[];
  caras: DividaAvaliada[];
  medias: DividaAvaliada[];
  baratas: DividaAvaliada[];
  totalCaras: number;
  totalMedias: number;
  /** juros mensais somados das dívidas caras */
  jurosMensaisCaras: number;
  /** meses pra quitar todas as caras com o aporte atual; null = nunca, com esse aporte */
  mesesParaQuitarCaras: number | null;
  mesesParaQuitarMedias: number | null;
}

export interface PlanoDeCorte {
  /** quanto os custos passam da renda, em reais */
  deficit: number;
  /** quanto precisa cortar pra sobrar a margem mínima */
  metaCorte: number;
  /** a meta em palavras — o que cortar e o que isso libera */
  metaTexto: string;
  /** onde cortar, em ordem de impacto */
  sugestoes: string[];
}

export interface Decisao {
  titulo: string;
  texto: string;
}

export interface Plano {
  perfil: Perfil;
  resumo: Resumo;
  modoCorte: boolean;
  corte: PlanoDeCorte | null;
  degrau: Degrau;
  decisao: Decisao;
  /** parte do excedente que vai pra cascata este mês */
  aporte: number;
  /** parte do excedente que fica livre pra gastos variáveis */
  livre: number;
  alocacoes: Alocacao[];
  folego: Folego;
  reserva: Reserva;
  dividas: QuadroDividas;
  proximosPassos: string[];
}

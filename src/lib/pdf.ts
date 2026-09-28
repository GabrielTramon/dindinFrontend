import type { Grupo, Organizacao, Perfil, Plano } from "@/domain";
import type { Sessao } from "./sessao";

/*
  O PDF do plano. Hoje ainda não existe: a função devolve { tipo: "em-breve" }
  e o BotaoPdf mostra o toast "O PDF chega na próxima atualização do dindin…".

  Plugar a geração é trocar SÓ esta função: quando ela devolver
  { tipo: "arquivo", arquivo, nome }, o BotaoPdf já baixa por object URL.
  A sessão entra porque o PDF é liberado pela conta (a geração pode ir ao
  servidor com o Bearer); o plano em si continua saindo do navegador.
*/

/** O que a tela do resultado entrega pro BotaoPdf. */
export interface DadosDoPlanoPdf {
  perfil: Perfil;
  plano: Plano;
  /** os potes como a pessoa deixou (valor em R$) */
  grupos: Grupo[];
  /** a divisão já calculada sobre o que sobra, se a tela tiver */
  organizacao?: Organizacao | null;
  /** "hoje" entra por parâmetro, como no domínio: datas do PDF saem daqui */
  hoje: Date;
}

/** O que o BotaoPdf passa pra geração: os dados do plano + a sessão que libera o PDF. */
export interface EntradaPdf extends DadosDoPlanoPdf {
  sessao: Sessao;
}

export type ResultadoPdf = { tipo: "em-breve" } | { tipo: "arquivo"; arquivo: Blob; nome: string };

export async function gerarPdfDoPlano(entrada: EntradaPdf): Promise<ResultadoPdf> {
  void entrada;
  return { tipo: "em-breve" };
}

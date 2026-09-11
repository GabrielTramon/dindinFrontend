export * from "./types";
export * from "./config";
export { gerarPlano, avaliarDividas, simularQuitacao, taxaMensal } from "./motor";
export type { OpcoesMotor, Cronograma } from "./motor";
export { projetarSaldo, mesesParaMeta, aporteParaMeta, serieProjecao } from "./projecao";
export type { ParametrosProjecao, PontoProjecao } from "./projecao";
export {
  perfilSchema,
  dividaSchema,
  validarPerfil,
  TIPOS_RENDA,
  MORADIAS,
  MORADIAS_SEM_CUSTO,
  TIPOS_DIVIDA,
} from "./schema";
export type { PerfilInput, PerfilValidado } from "./schema";
export { NOME_DIVIDA, ROTULO_DIVIDA, ROTULO_DEGRAU } from "./textos";

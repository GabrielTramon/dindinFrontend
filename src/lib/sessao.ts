import { useSyncExternalStore } from "react";
import { z } from "zod";
import { ApiError, buscarMe, type ContaApi, type SessaoApi } from "./api";
import { readJSON, removeKey, STORAGE_KEYS, subscribeStorage, writeJSON } from "./storage";

/*
  Sessão da conta e o "pra onde voltar" depois de entrar.

  A conta só libera o PDF: o plano continua no navegador, com ou sem ela. Por
  isso a sessão é pequena ({ accessToken, expiresAt, email }), mora no
  localStorage via @/lib/storage e é SEMPRE lida por lerSessao(), que confere a
  forma e o vencimento — um valor estranho ou vencido conta como deslogado.

  Forma e validade locais não bastam pra liberar o PDF: o localStorage é da
  pessoa e dá pra escrever qualquer coisa nele. Antes do PDF, o BotaoPdf chama
  confirmarSessaoNoServidor(), um GET /me novo a cada toque.

  Sessão que cai sozinha (401 do servidor, validade passada) deixa o e-mail em
  sessaoVencida(): a gaveta de entrar diz "Sua sessão venceu" mesmo quando
  quem apagou a sessão foi a validação ao carregar a página.

  O retorno só aceita caminho interno ("/…", sem "//", "\\", espaço nem
  caractere de controle): é ele que /entrar, /criar-conta e /redefinir-senha
  usam no router.replace depois de entrar, e um "//site.com" ali seria open
  redirect.
*/

/* ---------- sessão ---------- */

export interface Sessao {
  accessToken: string;
  /** ISO 8601 */
  expiresAt: string;
  email: string;
}

const sessaoSchema = z.object({
  accessToken: z.string().min(1).max(4096),
  expiresAt: z.string().min(1).max(64),
  email: z.string().min(3).max(320).includes("@"),
});

function sessaoValida(bruto: unknown, agora: number): Sessao | null {
  const lido = sessaoSchema.safeParse(bruto);
  if (!lido.success) return null;
  const vence = Date.parse(lido.data.expiresAt);
  if (!Number.isFinite(vence) || vence <= agora) return null;
  return lido.data;
}

/*
  useSyncExternalStore exige que o snapshot devolva a MESMA referência enquanto
  nada mudou (senão entra em loop). readJSON faz JSON.parse a cada chamada, então
  a última sessão lida fica guardada e é devolvida enquanto token, validade e
  e-mail forem os mesmos.
*/
let ultimaLida: { chave: string; sessao: Sessao | null } = { chave: "", sessao: null };

/**
 * A sessão gravada, se tiver a forma certa e ainda não tiver vencido; senão null.
 * Não escreve nada (é o snapshot do useSessao): quem remove o lixo é
 * validarSessaoEmSegundoPlano().
 */
export function lerSessao(agora: number = Date.now()): Sessao | null {
  const sessao = sessaoValida(readJSON<unknown>(STORAGE_KEYS.sessao, null), agora);
  const chave = sessao ? `${sessao.accessToken}\n${sessao.expiresAt}\n${sessao.email}` : "";
  if (chave !== ultimaLida.chave) ultimaLida = { chave, sessao };
  return ultimaLida.sessao;
}

/**
 * Grava a sessão (a resposta de /auth/cadastrar, /auth/entrar,
 * /auth/redefinir-senha ou /auth/verificar, ou uma Sessao pronta).
 * Recusa forma errada ou validade vencida. As outras abas ficam sabendo pelo
 * evento "storage"; esta, pelo aviso do writeJSON.
 */
export function salvarSessao(entrada: Sessao | SessaoApi): boolean {
  const email = "subscriber" in entrada ? entrada.subscriber.email : entrada.email;
  const sessao = sessaoValida(
    { accessToken: entrada.accessToken, expiresAt: entrada.expiresAt, email },
    Date.now(),
  );
  if (!sessao) return false;
  const gravou = writeJSON(STORAGE_KEYS.sessao, sessao);
  if (gravou) emailDaSessaoVencida = null;
  return gravou;
}

/**
 * Sai da conta neste navegador. O plano, os potes e as respostas ficam.
 * Foi a pessoa que saiu: nada de "sua sessão venceu" depois.
 */
export function sair(): void {
  emailDaSessaoVencida = null;
  removeKey(STORAGE_KEYS.sessao);
}

/* ---------- a sessão que venceu ---------- */

/*
  Quando a sessão cai sem a pessoa pedir — o servidor recusou o token (401:
  conta excluída noutro aparelho, senha trocada, segredo do servidor trocado)
  ou a validade passou —, a próxima gaveta de entrar diz "Sua sessão venceu" e
  já vem com o e-mail. Quem tira a sessão nem sempre é quem abre a gaveta: a
  validação em segundo plano (ao carregar a página) apaga a sessão recusada
  antes de qualquer toque no "Baixar PDF". Por isso o e-mail fica aqui, pelo
  resto do carregamento. sair() e uma sessão nova apagam o recado.
*/
let emailDaSessaoVencida: string | null = null;

/** Tira do navegador o que lerSessao recusa. Forma certa com a validade passada conta como vencida. */
function descartarSessaoInvalida(): void {
  const cru = readJSON<unknown>(STORAGE_KEYS.sessao, null);
  if (cru === null) return;
  const lida = sessaoSchema.safeParse(cru);
  if (lida.success) emailDaSessaoVencida = lida.data.email;
  removeKey(STORAGE_KEYS.sessao);
}

/** O servidor recusou este token (401): sai do navegador se ainda for o gravado, e fica o recado. */
function descartarSessaoRecusada(sessao: Sessao): void {
  // só limpa se ninguém entrou com outro token enquanto o GET voava
  if (lerSessao()?.accessToken !== sessao.accessToken) return;
  removeKey(STORAGE_KEYS.sessao);
  emailDaSessaoVencida = sessao.email;
}

/**
 * A sessão deste navegador venceu sem a pessoa sair? Devolve o e-mail dela (pra
 * gaveta dizer "Sua sessão venceu" e preencher o campo); null quando há sessão
 * válida, quando nunca houve, ou quando a pessoa saiu por conta própria.
 */
export function sessaoVencida(agora: number = Date.now()): { email: string } | null {
  if (lerSessao(agora)) return null;
  if (emailDaSessaoVencida) return { email: emailDaSessaoVencida };
  // ainda gravada, com a validade passada (ninguém limpou ainda)
  const lida = sessaoSchema.safeParse(readJSON<unknown>(STORAGE_KEYS.sessao, null));
  return lida.success ? { email: lida.data.email } : null;
}

const semSessaoNoServidor = () => null;

/** A sessão atual, redesenhando quando ela muda nesta aba ou em outra. No servidor, sempre null. */
export function useSessao(): Sessao | null {
  return useSyncExternalStore(subscribeStorage, lerSessao, semSessaoNoServidor);
}

/* ---------- validação em segundo plano ---------- */

export type ResultadoValidacao =
  /** não havia sessão (ou havia lixo/sessão vencida, que foi removida) */
  | { tipo: "sem-sessao" }
  /** a API confirmou: a conta existe e o token vale */
  | { tipo: "valida"; conta: ContaApi }
  /** a API respondeu 401: a sessão foi removida */
  | { tipo: "expirada" }
  /** rede ou erro do servidor: a sessão FICA (offline não desloga ninguém) */
  | { tipo: "falhou"; erro: ApiError };

/* um GET /me por carregamento de página e por token: o header e a /conta dividem a mesma resposta */
const validacoes = new Map<string, Promise<ResultadoValidacao>>();

/**
 * Confere a sessão com a API uma vez por carregamento. 401 limpa a sessão
 * (se ainda for a mesma); rede ou 5xx não limpa. Sessão com forma errada ou
 * vencida é removida sem ir à rede.
 */
export function validarSessaoEmSegundoPlano(): Promise<ResultadoValidacao> {
  const sessao = lerSessao();
  if (!sessao) {
    descartarSessaoInvalida();
    return Promise.resolve({ tipo: "sem-sessao" });
  }

  const token = sessao.accessToken;
  const emAndamento = validacoes.get(token);
  if (emAndamento) return emAndamento;

  const validacao = buscarMe(token).then(
    (conta): ResultadoValidacao => ({ tipo: "valida", conta }),
    (erro: unknown): ResultadoValidacao => {
      const apiErro = erro instanceof ApiError ? erro : new ApiError(0, "rede", String(erro));
      if (apiErro.status === 401) {
        descartarSessaoRecusada(sessao);
        return { tipo: "expirada" };
      }
      return { tipo: "falhou", erro: apiErro };
    },
  );
  validacoes.set(token, validacao);
  return validacao;
}

/* ---------- conferência na hora (o PDF) ---------- */

export type ResultadoConferencia =
  /** não havia sessão válida neste navegador (forma errada ou vencida conta como nenhuma) */
  | { tipo: "sem-sessao" }
  /** a API confirmou agora: a conta existe e ESTE token vale */
  | { tipo: "valida"; conta: ContaApi; sessao: Sessao }
  /** a API respondeu 401: a sessão foi removida (se ainda era a mesma) */
  | { tipo: "expirada" }
  /** rede, 429 ou 5xx: não deu pra saber; a sessão FICA, e quem chamou não segue */
  | { tipo: "falhou"; erro: ApiError };

/**
 * Confere a sessão com a API AGORA: um GET /me novo a cada chamada, sem o cache
 * de validarSessaoEmSegundoPlano (que vale uma vez por carregamento e pode ter
 * dado "valida" antes de a conta ser excluída em outra aba). É o portão do PDF:
 * sessão falsa ou vencida no localStorage não passa daqui.
 */
export async function confirmarSessaoNoServidor(): Promise<ResultadoConferencia> {
  const sessao = lerSessao();
  if (!sessao) {
    descartarSessaoInvalida();
    return { tipo: "sem-sessao" };
  }
  try {
    const conta = await buscarMe(sessao.accessToken);
    return { tipo: "valida", conta, sessao };
  } catch (erro) {
    const apiErro = erro instanceof ApiError ? erro : new ApiError(0, "rede", String(erro));
    if (apiErro.status === 401) {
      descartarSessaoRecusada(sessao);
      return { tipo: "expirada" };
    }
    return { tipo: "falhou", erro: apiErro };
  }
}

/* ---------- pra onde voltar depois de entrar ---------- */

export type MotivoRetorno = "pdf";

export interface Retorno {
  /** caminho interno, com busca e hash se tiver ("/plano/resultado") */
  caminho: string;
  /** por que a pessoa foi entrar — muda o toast no destino */
  motivo?: MotivoRetorno;
  /** o e-mail que ela digitou, pra preencher de novo na próxima tela (entrar ↔ criar conta ↔ esqueci a senha) */
  email?: string;
}

const TAMANHO_MAXIMO_CAMINHO = 512;

/** as telas de entrar: voltar pra uma delas depois de entrar seria um laço */
const TELA_DE_ENTRAR = /^\/(?:entrar|criar-conta|esqueci-senha|redefinir-senha)(?:[/?#]|$)/;

/**
 * O próprio caminho, se for interno e seguro pra router.replace; senão null.
 * Barra "//outro.site", "/\\outro.site", esquema ("https:"), espaço e controle
 * (o navegador apaga tab/quebra de linha e "/\t/x" viraria "//x"). As telas de
 * entrar (/entrar, /criar-conta, /esqueci-senha, /redefinir-senha) também ficam
 * de fora: voltar pra elas depois de entrar seria um laço.
 */
export function caminhoInterno(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  if (valor.length === 0 || valor.length > TAMANHO_MAXIMO_CAMINHO) return null;
  if (!valor.startsWith("/")) return null;
  if (valor.includes("//") || valor.includes("\\")) return null;
  if (/[\u0000-\u001f\u007f\s]/.test(valor)) return null;
  if (TELA_DE_ENTRAR.test(valor)) return null;
  return valor;
}

/**
 * O caminho interno de um document.referrer, se ele for deste site; senão null.
 * `origem` é o window.location.origin.
 */
export function caminhoDoReferrer(referrer: string, origem: string): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (url.origin !== origem) return null;
    return caminhoInterno(`${url.pathname}${url.search}${url.hash}`);
  } catch {
    return null;
  }
}

const retornoSchema = z.object({
  caminho: z.string(),
  motivo: z.literal("pdf").optional(),
  email: z.string().max(320).optional(),
});

/** Grava pra onde voltar. Caminho externo ou estranho é recusado (devolve false e não grava). */
export function guardarRetorno(caminho: string, motivo?: MotivoRetorno, email?: string): boolean {
  const seguro = caminhoInterno(caminho);
  if (!seguro) return false;
  const retorno: Retorno = { caminho: seguro };
  if (motivo) retorno.motivo = motivo;
  const emailLimpo = email?.trim();
  if (emailLimpo && emailLimpo.length <= 320) retorno.email = emailLimpo;
  return writeJSON(STORAGE_KEYS.retorno, retorno);
}

/** O retorno gravado, revalidado (o localStorage pode ter sido mexido à mão); senão null. */
export function lerRetorno(): Retorno | null {
  const lido = retornoSchema.safeParse(readJSON<unknown>(STORAGE_KEYS.retorno, null));
  if (!lido.success) return null;
  const caminho = caminhoInterno(lido.data.caminho);
  if (!caminho) return null;
  const retorno: Retorno = { caminho };
  if (lido.data.motivo) retorno.motivo = lido.data.motivo;
  if (lido.data.email) retorno.email = lido.data.email;
  return retorno;
}

export function limparRetorno(): void {
  removeKey(STORAGE_KEYS.retorno);
}

/* ---------- aviso de boas-vindas no destino ---------- */

/*
  As telas de entrar e a página de destino têm ToastProviders diferentes: um
  toast disparado lá some na troca de rota. Então a tela de entrar deixa o recado
  aqui (estado de módulo, que sobrevive ao router.replace do lado do cliente) e o
  destino consome UMA vez ao montar. F5 no destino não repete o toast — de propósito.
*/

/** como a pessoa acabou de entrar — escolhe a frase do toast no destino */
export type ComoEntrou =
  /** e-mail e senha, no /entrar */
  | "entrou"
  /** conta nova, no /criar-conta */
  | "criou"
  /** o link "Confirme seu e-mail" (/entrar#token=…) */
  | "confirmou"
  /** senha nova, no /redefinir-senha */
  | "redefiniu";

export interface Entrada {
  email: string;
  motivo?: MotivoRetorno;
  /** sem ele, vale "entrou" */
  como?: ComoEntrou;
}

let entradaPendente: Entrada | null = null;

export function anunciarEntrada(entrada: Entrada): void {
  entradaPendente = entrada;
}

/** Devolve o recado deixado pelo /entrar e apaga (a segunda chamada devolve null). */
export function consumirEntrada(): Entrada | null {
  const entrada = entradaPendente;
  entradaPendente = null;
  return entrada;
}

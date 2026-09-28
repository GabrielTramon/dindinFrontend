/*
  Cliente da API do dindin (dindinBackend). Só a parte de conta: criar conta e
  entrar (e-mail + senha), esqueci/redefinir a senha, confirmar o e-mail, ler a
  conta, trocar a senha, exportar e excluir. O plano NÃO passa por aqui —
  continua no navegador.

  Todo erro vira ApiError { status, code, message, details? }:
  - resposta da API: o `code` estável e a `message` pt-BR que ela manda (já
    pronta pra tela: "E-mail ou senha incorretos."), e `details` por campo
    quando a API manda ({ senha: "A senha precisa ter pelo menos 8 caracteres." });
  - sem resposta (offline, CORS, API fora do ar, demora): status 0, code "rede".
  A tela decide pelo `code`/`status` e mostra a `message`.

  Senha vai no corpo exatamente como a pessoa digitou: nunca aparar nem
  normalizar (espaço no fim é parte da senha).
*/

export const API_URL = `${(process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "")}/v1`;

export const MENSAGEM_REDE = "Não deu pra falar com o dindin agora. Confira sua internet e tente de novo.";

const MENSAGEM_INESPERADA = "Algo deu errado do nosso lado. Tente de novo em instantes.";

/** A palavra que o DELETE /me exige no corpo (CONFIRMACAO_EXCLUSAO do backend). */
export const CONFIRMACAO_EXCLUSAO = "EXCLUIR";

/** Sem resposta nesse tempo, conta como rede: melhor a frase de rede que um botão girando pra sempre. */
const TEMPO_LIMITE_MS = 15_000;

export class ApiError extends Error {
  readonly status: number;
  /** o `error.code` da API (VALIDACAO, NAO_AUTENTICADO, CONFLITO, MUITAS_REQUISICOES…) ou "rede" */
  readonly code: string;
  /** mensagem por campo, quando a API manda (ex.: { email: "Informe um e-mail válido" }) */
  readonly details?: Record<string, string>;

  constructor(status: number, code: string, message: string, details?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function ehErroDeRede(erro: unknown): boolean {
  return erro instanceof ApiError && erro.status === 0;
}

/* ---------- formatos que a API devolve ---------- */

/** GET /me */
export interface ContaApi {
  id: string;
  email: string;
  emailVerificadoEm: string | null;
  ativo: boolean;
  /** ISO 8601 */
  criadoEm: string;
  /**
   * false só em conta antiga (do tempo do link mágico) que ainda não criou
   * senha: a /conta mostra "Criar senha", sem pedir a atual.
   */
  temSenha: boolean;
}

/** POST /auth/cadastrar · /auth/entrar · /auth/redefinir-senha · /auth/verificar */
export interface SessaoApi {
  accessToken: string;
  /** ISO 8601 */
  expiresAt: string;
  subscriber: Omit<ContaApi, "criadoEm" | "temSenha">;
}

/** Corpo do POST /me/senha. `senhaAtual` só fica de fora quando a conta ainda não tem senha. */
export interface TrocaDeSenha {
  senhaAtual?: string;
  senhaNova: string;
}

/** GET /me/exportar, já pronto pra baixar */
export interface DadosExportados {
  arquivo: Blob;
  nome: string;
}

/* ---------- núcleo ---------- */

type Metodo = "GET" | "POST" | "DELETE";

interface Pedido {
  metodo: Metodo;
  caminho: string;
  token?: string;
  corpo?: unknown;
}

function sinalComTempoLimite(): AbortSignal | undefined {
  return typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
    ? AbortSignal.timeout(TEMPO_LIMITE_MS)
    : undefined;
}

async function chamar({ metodo, caminho, token, corpo }: Pedido): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (corpo !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      // sessão vai no header, nunca em cookie; e nada disto pode vir de cache
      credentials: "omit",
      cache: "no-store",
      signal: sinalComTempoLimite(),
    });
  } catch {
    throw new ApiError(0, "rede", MENSAGEM_REDE);
  }

  if (!resposta.ok) throw await erroDaResposta(resposta);
  return resposta;
}

/** { "error": { "code", "message", "details"? } } — o formato de shared/infra/http/error-handler.ts */
async function erroDaResposta(resposta: Response): Promise<ApiError> {
  try {
    const corpo: unknown = await resposta.json();
    const erro = (corpo as { error?: unknown } | null)?.error as
      | { code?: unknown; message?: unknown; details?: unknown }
      | undefined;
    if (erro && typeof erro.code === "string" && typeof erro.message === "string") {
      const details = ehMapaDeTexto(erro.details) ? erro.details : undefined;
      return new ApiError(resposta.status, erro.code, erro.message, details);
    }
  } catch {
    /* corpo que não é JSON (proxy, 502 em HTML): cai na frase genérica */
  }
  return new ApiError(resposta.status, "desconhecido", MENSAGEM_INESPERADA);
}

function ehMapaDeTexto(valor: unknown): valor is Record<string, string> {
  return (
    typeof valor === "object" &&
    valor !== null &&
    Object.values(valor).every((v) => typeof v === "string")
  );
}

async function lerJson<T>(resposta: Response, valido: (valor: unknown) => valor is T): Promise<T> {
  let corpo: unknown;
  try {
    corpo = await resposta.json();
  } catch {
    throw new ApiError(resposta.status, "desconhecido", MENSAGEM_INESPERADA);
  }
  if (!valido(corpo)) throw new ApiError(resposta.status, "desconhecido", MENSAGEM_INESPERADA);
  return corpo;
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null;
}

/** a conta do GET /me, com `temSenha` ainda por conferir (ver buscarMe) */
type ContaCrua = Omit<ContaApi, "temSenha"> & { temSenha?: unknown };

function ehContaCrua(valor: unknown): valor is ContaCrua {
  return ehObjeto(valor) && typeof valor.id === "string" && typeof valor.email === "string" && typeof valor.criadoEm === "string";
}

function ehSessao(valor: unknown): valor is SessaoApi {
  return (
    ehObjeto(valor) &&
    typeof valor.accessToken === "string" &&
    typeof valor.expiresAt === "string" &&
    ehObjeto(valor.subscriber) &&
    typeof valor.subscriber.email === "string"
  );
}

function ehMensagem(valor: unknown): valor is { message: string } {
  return ehObjeto(valor) && typeof valor.message === "string";
}

/* ---------- rotas ---------- */

/**
 * POST /auth/cadastrar (201). Cria a conta e já devolve a sessão: a pessoa entra
 * na hora, sem esperar e-mail (o "Confirme seu e-mail" vai junto, mas não trava
 * nada). 409 (CONFLITO) = já existe conta com esse e-mail.
 */
export async function cadastrar(email: string, senha: string): Promise<SessaoApi> {
  const resposta = await chamar({ metodo: "POST", caminho: "/auth/cadastrar", corpo: { email, senha } });
  return lerJson(resposta, ehSessao);
}

/**
 * POST /auth/entrar (200). 401 "E-mail ou senha incorretos." é a MESMA resposta
 * pra e-mail que não existe, senha errada e conta sem senha: não revela quem tem conta.
 */
export async function entrar(email: string, senha: string): Promise<SessaoApi> {
  const resposta = await chamar({ metodo: "POST", caminho: "/auth/entrar", corpo: { email, senha } });
  return lerJson(resposta, ehSessao);
}

/**
 * POST /auth/esqueci-senha (202). A frase é a mesma exista a conta ou não (e
 * dentro do limite de reenvio também).
 */
export async function esqueciSenha(email: string): Promise<{ message: string }> {
  const resposta = await chamar({ metodo: "POST", caminho: "/auth/esqueci-senha", corpo: { email } });
  return lerJson(resposta, ehMensagem);
}

/**
 * POST /auth/redefinir-senha (200). Grava a senha nova, confirma o e-mail, gasta
 * o token (uso único) e devolve a sessão. 401 = link vencido ou já usado.
 */
export async function redefinirSenha(token: string, senha: string): Promise<SessaoApi> {
  const resposta = await chamar({ metodo: "POST", caminho: "/auth/redefinir-senha", corpo: { token, senha } });
  return lerJson(resposta, ehSessao);
}

/**
 * POST /auth/verificar — o link "Confirme seu e-mail" que o cadastro manda.
 * O token é de uso único: chamar UMA vez por token.
 */
export async function verificarToken(token: string): Promise<SessaoApi> {
  const resposta = await chamar({ metodo: "POST", caminho: "/auth/verificar", corpo: { token } });
  return lerJson(resposta, ehSessao);
}

/**
 * GET /me — 401 (NAO_AUTENTICADO) quando a sessão venceu ou a conta sumiu.
 * `temSenha` fora do formato (API de antes da senha) conta como true: pedir a
 * senha atual sem precisar é menos ruim que trocar a senha sem ela.
 */
export async function buscarMe(token: string): Promise<ContaApi> {
  const resposta = await chamar({ metodo: "GET", caminho: "/me", token });
  const conta = await lerJson(resposta, ehContaCrua);
  return { ...conta, temSenha: typeof conta.temSenha === "boolean" ? conta.temSenha : true };
}

/**
 * POST /me/senha (200) → uma sessão NOVA. A senha nova encerra todas as
 * sessões de antes no servidor, inclusive a que fez o pedido: quem chama troca
 * o token guardado por este (salvarSessao), senão o próximo pedido é 401.
 * Senha atual errada volta 400 VALIDACAO com `details.senhaAtual` — nunca 401,
 * que aqui continua querendo dizer sessão vencida.
 */
export async function trocarSenha(token: string, troca: TrocaDeSenha): Promise<SessaoApi> {
  const corpo: TrocaDeSenha =
    troca.senhaAtual === undefined ? { senhaNova: troca.senhaNova } : { senhaAtual: troca.senhaAtual, senhaNova: troca.senhaNova };
  const resposta = await chamar({ metodo: "POST", caminho: "/me/senha", token, corpo });
  return lerJson(resposta, ehSessao);
}

/**
 * DELETE /me (204). O backend exige { confirmacao: "EXCLUIR" } no corpo;
 * a tela só chama depois que a pessoa digitou a palavra.
 */
export async function excluirConta(token: string, confirmacao: string = CONFIRMACAO_EXCLUSAO): Promise<void> {
  await chamar({ metodo: "DELETE", caminho: "/me", token, corpo: { confirmacao } });
}

/** GET /me/exportar — o JSON inteiro como arquivo, com o nome que a API sugere. */
export async function exportarDados(token: string): Promise<DadosExportados> {
  const resposta = await chamar({ metodo: "GET", caminho: "/me/exportar", token });
  let arquivo: Blob;
  try {
    arquivo = await resposta.blob();
  } catch {
    throw new ApiError(0, "rede", MENSAGEM_REDE);
  }
  return { arquivo, nome: nomeDoArquivo(resposta.headers.get("Content-Disposition")) };
}

function nomeDoArquivo(disposicao: string | null): string {
  const nome = disposicao?.match(/filename="?([^";]+)"?/i)?.[1]?.trim();
  // só o nome, sem pasta: o que vier da rede não escolhe diretório
  return nome && /^[\w.-]+$/.test(nome) ? nome : "dindin-meus-dados.json";
}

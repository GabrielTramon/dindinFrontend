import { ApiError, MENSAGEM_REDE } from "@/lib/api";

/*
  Validação dos formulários de conta, sem React (tem teste: validacao.test.ts).

  As regras da senha são AS MESMAS do servidor, com as mesmas frases: 8 a 128
  caracteres e só espaços não vale. A senha nunca é aparada nem normalizada —
  "minhasenha " (com espaço no fim) é outra senha, e é validada como veio.
  Quem decide de verdade é a API; aqui é só pra pessoa não esperar a rede pra
  saber que faltou um caractere.

  O e-mail é aparado (a API também normaliza). O formato é o suficiente pra
  pegar "falta o @ ou o domínio".
*/

export const SENHA_MINIMO = 8;
export const SENHA_MAXIMO = 128;

export const ERRO_EMAIL = "Confira o e-mail: falta o @ ou o domínio.";
export const ERRO_EMAIL_VAZIO = "Informe o seu e-mail.";
/* as frases da senha são as do backend (modules/identidade/domain/senha.ts e application/) */
export const ERRO_SENHA_CURTA = "A senha precisa ter pelo menos 8 caracteres.";
export const ERRO_SENHA_LONGA = "A senha pode ter no máximo 128 caracteres.";
export const ERRO_SENHA_VAZIA = "Informe a sua senha.";
export const ERRO_SENHA_ATUAL_VAZIA = "Informe a sua senha atual.";

/** a dica fixa embaixo dos campos de senha nova */
export const DICA_SENHA = "Pelo menos 8 caracteres";

const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** A frase de erro do e-mail (já aparado por quem chama ou não), ou null se passa. */
export function erroDoEmail(bruto: string): string | null {
  const email = bruto.trim();
  if (email.length === 0) return ERRO_EMAIL_VAZIO;
  return FORMATO_EMAIL.test(email) ? null : ERRO_EMAIL;
}

/**
 * Senha que vai ser CRIADA (cadastro, redefinir, trocar): as regras do servidor,
 * na mesma ordem. Só espaços conta como curta (é a frase que o servidor usa).
 * O tamanho é o `length` (unidades UTF-16), o mesmo que o maxLength do campo e o servidor contam.
 */
export function erroDaSenhaNova(senha: string): string | null {
  if (senha.length > SENHA_MAXIMO) return ERRO_SENHA_LONGA;
  if (senha.length < SENHA_MINIMO || senha.trim() === "") return ERRO_SENHA_CURTA;
  return null;
}

/**
 * Senha que a pessoa DIGITA pra provar quem é (entrar, senha atual): só não pode
 * ir vazia (o teto de 128 o maxLength do campo já garante). O mínimo não vale
 * aqui, como no servidor: se um dia ele subir, quem já tem senha continua entrando.
 */
export function erroDaSenhaDigitada(senha: string, vazia: string = ERRO_SENHA_VAZIA): string | null {
  return senha.length === 0 ? vazia : null;
}

/* ---------- erros que vêm da API ---------- */

/** A frase de uma falha da API pra tela. A API já manda a mensagem pronta; sem resposta, a de rede. */
export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof ApiError) {
    if (erro.code === "VALIDACAO" && erro.details?.email) return ERRO_EMAIL;
    return erro.message;
  }
  return MENSAGEM_REDE;
}

export type CampoConta = "email" | "senha" | "senhaAtual" | "senhaNova";

export interface ErrosDaApi {
  /** frase por campo, no campo certo */
  campos: Partial<Record<CampoConta, string>>;
  /** frase que não é de um campo só (401 do entrar, 429, rede…) */
  geral: string | null;
  /** 409 do cadastro: já existe conta com esse e-mail (a frase vai no campo do e-mail) */
  conflito: boolean;
}

/* a API pode chamar a senha nova de "senha" numa rota e de "senhaNova" em outra: aceita as duas */
const APELIDOS: Record<CampoConta, readonly string[]> = {
  email: ["email"],
  senha: ["senha", "senhaNova"],
  senhaAtual: ["senhaAtual"],
  senhaNova: ["senhaNova", "senha"],
};

/**
 * Distribui um erro da API pelos campos do formulário (`campos`, só os que a
 * tela tem). VALIDACAO com `details` de um desses campos vai pro campo; e-mail
 * inválido ganha a nossa frase, mais concreta. 409 (CONFLITO) vai pro e-mail.
 * O resto é frase geral.
 */
export function errosDaApi(erro: unknown, campos: readonly CampoConta[]): ErrosDaApi {
  if (erro instanceof ApiError) {
    if (erro.code === "CONFLITO" && campos.includes("email")) {
      return { campos: { email: erro.message }, geral: null, conflito: true };
    }
    if (erro.code === "VALIDACAO" && erro.details) {
      const porCampo: Partial<Record<CampoConta, string>> = {};
      for (const campo of campos) {
        const chave = APELIDOS[campo].find((c) => erro.details?.[c]);
        if (!chave) continue;
        porCampo[campo] = campo === "email" ? ERRO_EMAIL : erro.details[chave];
      }
      if (Object.keys(porCampo).length > 0) return { campos: porCampo, geral: null, conflito: false };
    }
  }
  return { campos: {}, geral: mensagemDeErro(erro), conflito: false };
}

/** O primeiro campo (na ordem da tela) que tem erro — é ele que recebe o foco. */
export function primeiroComErro<C extends string>(ordem: readonly C[], erros: Partial<Record<C, string | null>>): C | null {
  return ordem.find((campo) => Boolean(erros[campo])) ?? null;
}

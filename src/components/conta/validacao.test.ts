import { describe, expect, it } from "vitest";
import { ApiError, MENSAGEM_REDE } from "@/lib/api";
import {
  ERRO_EMAIL,
  ERRO_EMAIL_VAZIO,
  ERRO_SENHA_ATUAL_VAZIA,
  ERRO_SENHA_CURTA,
  ERRO_SENHA_LONGA,
  ERRO_SENHA_VAZIA,
  erroDaSenhaDigitada,
  erroDaSenhaNova,
  erroDoEmail,
  errosDaApi,
  mensagemDeErro,
  primeiroComErro,
} from "./validacao";

/*
  O que estes testes protegem:
  - a senha segue as MESMAS regras e frases do servidor (8 a 128, só espaços
    não vale) e nunca é aparada — "minhasenha " é outra senha;
  - quem só digita a senha pra entrar não ouve a regra de criar;
  - o erro da API cai no campo certo (details), o 409 vai pro e-mail e o resto
    vira frase geral.
*/

describe("erroDaSenhaNova (as regras do servidor)", () => {
  it("pede pelo menos 8 caracteres (vazia também)", () => {
    expect(erroDaSenhaNova("")).toBe(ERRO_SENHA_CURTA);
    expect(erroDaSenhaNova("1234567")).toBe(ERRO_SENHA_CURTA);
    expect(erroDaSenhaNova("12345678")).toBeNull();
    expect(ERRO_SENHA_CURTA).toBe("A senha precisa ter pelo menos 8 caracteres.");
  });

  it("aceita até 128 e recusa 129", () => {
    expect(erroDaSenhaNova("a".repeat(128))).toBeNull();
    expect(erroDaSenhaNova("a".repeat(129))).toBe(ERRO_SENHA_LONGA);
    expect(ERRO_SENHA_LONGA).toBe("A senha pode ter no máximo 128 caracteres.");
  });

  it("só espaços não vale (com a frase de curta, como o servidor), mas espaço no meio ou na ponta é parte da senha", () => {
    expect(erroDaSenhaNova("        ")).toBe(ERRO_SENHA_CURTA);
    expect(erroDaSenhaNova("\t\t\t\t    ")).toBe(ERRO_SENHA_CURTA);
    expect(erroDaSenhaNova(" ".repeat(129))).toBe(ERRO_SENHA_LONGA);
    expect(erroDaSenhaNova("   ")).toBe(ERRO_SENHA_CURTA);
    expect(erroDaSenhaNova("minha senha")).toBeNull();
    // não apara: 7 letras + 1 espaço = 8 caracteres, vale
    expect(erroDaSenhaNova("abcdefg ")).toBeNull();
  });
});

describe("erroDaSenhaDigitada (entrar, senha atual)", () => {
  it("só reclama de vazia, com a frase do servidor", () => {
    expect(erroDaSenhaDigitada("")).toBe(ERRO_SENHA_VAZIA);
    expect(ERRO_SENHA_VAZIA).toBe("Informe a sua senha.");
    expect(erroDaSenhaDigitada("", ERRO_SENHA_ATUAL_VAZIA)).toBe(ERRO_SENHA_ATUAL_VAZIA);
    expect(ERRO_SENHA_ATUAL_VAZIA).toBe("Informe a sua senha atual.");
    // curta não é problema de quem está entrando: o servidor responde "E-mail ou senha incorretos."
    expect(erroDaSenhaDigitada("123")).toBeNull();
    expect(erroDaSenhaDigitada(" ")).toBeNull();
  });
});

describe("erroDoEmail", () => {
  it("vazio, sem @ ou sem domínio", () => {
    expect(erroDoEmail("")).toBe(ERRO_EMAIL_VAZIO);
    expect(erroDoEmail("   ")).toBe(ERRO_EMAIL_VAZIO);
    expect(erroDoEmail("ana")).toBe(ERRO_EMAIL);
    expect(erroDoEmail("ana@")).toBe(ERRO_EMAIL);
    expect(erroDoEmail("ana@email")).toBe(ERRO_EMAIL);
    expect(erroDoEmail("ana @email.com")).toBe(ERRO_EMAIL);
  });

  it("aceita e-mail com espaço nas pontas (a API normaliza)", () => {
    expect(erroDoEmail(" ana@email.com ")).toBeNull();
    expect(erroDoEmail("Ana.Souza+plano@Email.com.br")).toBeNull();
  });
});

describe("errosDaApi", () => {
  it("VALIDACAO com details vai pro campo certo; e-mail ganha a nossa frase", () => {
    const erro = new ApiError(400, "VALIDACAO", "Dados inválidos", {
      email: "Informe um e-mail válido",
      senha: "A senha precisa ter pelo menos 8 caracteres.",
    });
    expect(errosDaApi(erro, ["email", "senha"])).toEqual({
      campos: { email: ERRO_EMAIL, senha: "A senha precisa ter pelo menos 8 caracteres." },
      geral: null,
      conflito: false,
    });
  });

  it("senha atual errada (400, nunca 401) cai no campo da senha atual", () => {
    const erro = new ApiError(400, "VALIDACAO", "Dados inválidos", { senhaAtual: "A senha atual não confere." });
    expect(errosDaApi(erro, ["senhaAtual", "senhaNova"]).campos).toEqual({
      senhaAtual: "A senha atual não confere.",
    });
  });

  it("aceita a senha nova chamada de senha ou senhaNova", () => {
    const comoSenha = new ApiError(400, "VALIDACAO", "x", { senha: "A senha pode ter no máximo 128 caracteres." });
    expect(errosDaApi(comoSenha, ["senhaAtual", "senhaNova"]).campos).toEqual({
      senhaNova: "A senha pode ter no máximo 128 caracteres.",
    });
    const comoSenhaNova = new ApiError(400, "VALIDACAO", "x", { senhaNova: "A senha precisa ter pelo menos 8 caracteres." });
    expect(errosDaApi(comoSenhaNova, ["email", "senha"]).campos).toEqual({
      senha: "A senha precisa ter pelo menos 8 caracteres.",
    });
  });

  it("details de campo que a tela não tem vira frase geral", () => {
    const erro = new ApiError(400, "VALIDACAO", "Dados inválidos", { token: "Token inválido" });
    expect(errosDaApi(erro, ["senha"])).toEqual({ campos: {}, geral: "Dados inválidos", conflito: false });
  });

  it("409 do cadastro: a frase da API no e-mail, marcado como conflito", () => {
    const frase = "Já existe uma conta com esse e-mail. Entre com a sua senha ou use “Esqueci a senha”.";
    const erro = new ApiError(409, "CONFLITO", frase);
    expect(errosDaApi(erro, ["email", "senha"])).toEqual({ campos: { email: frase }, geral: null, conflito: true });
  });

  it("401 do entrar, 429 e rede viram frase geral", () => {
    const errado = new ApiError(401, "NAO_AUTENTICADO", "E-mail ou senha incorretos.");
    expect(errosDaApi(errado, ["email", "senha"])).toEqual({
      campos: {},
      geral: "E-mail ou senha incorretos.",
      conflito: false,
    });
    const muitas = new ApiError(429, "MUITAS_REQUISICOES", "Muitas tentativas. Espere um pouco.");
    expect(errosDaApi(muitas, ["email", "senha"]).geral).toBe("Muitas tentativas. Espere um pouco.");
    expect(errosDaApi(new ApiError(0, "rede", MENSAGEM_REDE), ["email"]).geral).toBe(MENSAGEM_REDE);
    expect(errosDaApi(new Error("qualquer"), ["email"]).geral).toBe(MENSAGEM_REDE);
  });
});

describe("mensagemDeErro e primeiroComErro", () => {
  it("a mensagem da API passa; e-mail inválido ganha a nossa; o resto é rede", () => {
    expect(mensagemDeErro(new ApiError(401, "NAO_AUTENTICADO", "Esse link expirou ou já foi usado. Peça um novo."))).toBe(
      "Esse link expirou ou já foi usado. Peça um novo.",
    );
    expect(mensagemDeErro(new ApiError(400, "VALIDACAO", "x", { email: "Informe um e-mail válido" }))).toBe(ERRO_EMAIL);
    expect(mensagemDeErro("???")).toBe(MENSAGEM_REDE);
  });

  it("o primeiro campo com erro na ordem da tela", () => {
    expect(primeiroComErro(["email", "senha"] as const, { senha: "x", email: "y" })).toBe("email");
    expect(primeiroComErro(["email", "senha"] as const, { email: null, senha: "x" })).toBe("senha");
    expect(primeiroComErro(["email", "senha"] as const, {})).toBeNull();
  });
});

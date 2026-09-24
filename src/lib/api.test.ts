import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  API_URL,
  ApiError,
  MENSAGEM_REDE,
  buscarMe,
  cadastrar,
  entrar,
  esqueciSenha,
  redefinirSenha,
  trocarSenha,
  verificarToken,
} from "./api";

/*
  O que estes testes protegem (o contrato com o dindinBackend):
  - cada rota de conta vai no caminho e método certos, com o corpo certo — e a
    senha vai EXATAMENTE como foi digitada (nunca aparada);
  - a sessão volta validada; resposta estranha vira erro, nunca sessão;
  - o erro da API vira ApiError com status, code, message e details;
  - GET /me traz temSenha (e API antiga sem o campo conta como true).
  O fetch é um dublê: nada sai pra rede.
*/

interface Chamada {
  url: string;
  metodo: string;
  headers: Record<string, string>;
  corpo: unknown;
}

let chamadas: Chamada[];

function responder(status: number, corpo?: unknown) {
  const fetchFalso = vi.fn(async (url: string, init: RequestInit) => {
    chamadas.push({
      url,
      metodo: String(init.method),
      headers: init.headers as Record<string, string>,
      corpo: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    });
    return new Response(corpo === undefined ? null : JSON.stringify(corpo), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchFalso);
  return fetchFalso;
}

const SESSAO = {
  accessToken: "tok.en",
  expiresAt: "2026-10-24T12:00:00.000Z",
  subscriber: { id: "s1", email: "ana@email.com", emailVerificadoEm: null, ativo: true },
};

beforeEach(() => {
  chamadas = [];
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("cadastrar e entrar", () => {
  it("POST /auth/cadastrar com e-mail e senha como digitada; devolve a sessão (201)", async () => {
    responder(201, SESSAO);
    const sessao = await cadastrar("ana@email.com", "  minha senha  ");
    expect(sessao).toEqual(SESSAO);
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0]).toMatchObject({
      url: `${API_URL}/auth/cadastrar`,
      metodo: "POST",
      corpo: { email: "ana@email.com", senha: "  minha senha  " },
    });
    expect(chamadas[0].headers.Authorization).toBeUndefined();
  });

  it("409 vira ApiError CONFLITO com a frase da API", async () => {
    const frase = "Já existe uma conta com esse e-mail. Entre com a sua senha ou use “Esqueci a senha”.";
    responder(409, { error: { code: "CONFLITO", message: frase, requestId: "r1" } });
    const erro = await cadastrar("ana@email.com", "12345678").catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro).toMatchObject({ status: 409, code: "CONFLITO", message: frase });
  });

  it("400 traz os details por campo", async () => {
    responder(400, {
      error: {
        code: "VALIDACAO",
        message: "Dados inválidos",
        details: { senha: "A senha precisa ter pelo menos 8 caracteres." },
        requestId: "r2",
      },
    });
    const erro = await cadastrar("ana@email.com", "curta").catch((e: unknown) => e);
    expect(erro).toMatchObject({
      status: 400,
      code: "VALIDACAO",
      details: { senha: "A senha precisa ter pelo menos 8 caracteres." },
    });
  });

  it("POST /auth/entrar (200); 401 vira NAO_AUTENTICADO com a frase da API", async () => {
    responder(200, SESSAO);
    await expect(entrar("ana@email.com", "12345678")).resolves.toEqual(SESSAO);
    expect(chamadas[0]).toMatchObject({ url: `${API_URL}/auth/entrar`, metodo: "POST" });

    responder(401, { error: { code: "NAO_AUTENTICADO", message: "E-mail ou senha incorretos.", requestId: "r3" } });
    await expect(entrar("ana@email.com", "errada123")).rejects.toMatchObject({
      status: 401,
      code: "NAO_AUTENTICADO",
      message: "E-mail ou senha incorretos.",
    });
  });

  it("resposta sem cara de sessão não vira sessão", async () => {
    responder(200, { accessToken: "tok" });
    await expect(entrar("ana@email.com", "12345678")).rejects.toMatchObject({ code: "desconhecido" });
  });

  it("sem resposta (rede) vira status 0 com a frase de rede", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(entrar("ana@email.com", "12345678")).rejects.toMatchObject({
      status: 0,
      code: "rede",
      message: MENSAGEM_REDE,
    });
  });
});

describe("esqueci e redefinir a senha, confirmar o e-mail", () => {
  it("POST /auth/esqueci-senha (202) devolve a frase", async () => {
    const message = "Se existir uma conta com esse e-mail, o link pra criar uma senha nova chega em instantes.";
    responder(202, { message });
    await expect(esqueciSenha("ana@email.com")).resolves.toEqual({ message });
    expect(chamadas[0]).toMatchObject({
      url: `${API_URL}/auth/esqueci-senha`,
      metodo: "POST",
      corpo: { email: "ana@email.com" },
    });
  });

  it("POST /auth/redefinir-senha com token e senha; 401 = link vencido", async () => {
    responder(200, SESSAO);
    await expect(redefinirSenha("t".repeat(32), "senha nova!")).resolves.toEqual(SESSAO);
    expect(chamadas[0]).toMatchObject({
      url: `${API_URL}/auth/redefinir-senha`,
      corpo: { token: "t".repeat(32), senha: "senha nova!" },
    });

    responder(401, {
      error: { code: "NAO_AUTENTICADO", message: "Esse link expirou ou já foi usado. Peça um novo.", requestId: "r4" },
    });
    await expect(redefinirSenha("t".repeat(32), "senha nova!")).rejects.toMatchObject({ status: 401 });
  });

  it("POST /auth/verificar continua (o link de confirmação do cadastro)", async () => {
    responder(200, SESSAO);
    await expect(verificarToken("t".repeat(32))).resolves.toEqual(SESSAO);
    expect(chamadas[0]).toMatchObject({ url: `${API_URL}/auth/verificar`, corpo: { token: "t".repeat(32) } });
  });
});

describe("GET /me e POST /me/senha", () => {
  const CONTA = {
    id: "s1",
    email: "ana@email.com",
    emailVerificadoEm: "2026-09-24T12:00:00.000Z",
    ativo: true,
    criadoEm: "2026-09-01T12:00:00.000Z",
  };

  it("GET /me com Bearer traz temSenha", async () => {
    responder(200, { ...CONTA, temSenha: false });
    await expect(buscarMe("tok.en")).resolves.toEqual({ ...CONTA, temSenha: false });
    expect(chamadas[0]).toMatchObject({ url: `${API_URL}/me`, metodo: "GET" });
    expect(chamadas[0].headers.Authorization).toBe("Bearer tok.en");
  });

  it("API sem temSenha (antes da senha) conta como true", async () => {
    responder(200, CONTA);
    await expect(buscarMe("tok.en")).resolves.toMatchObject({ temSenha: true });
    responder(200, { ...CONTA, temSenha: "sim" });
    await expect(buscarMe("tok.en")).resolves.toMatchObject({ temSenha: true });
  });

  it("POST /me/senha (200) devolve a sessão NOVA; com a senha atual, e sem ela quando a conta não tem senha", async () => {
    const nova = { ...SESSAO, accessToken: "tok.novo" };
    responder(200, nova);
    await expect(trocarSenha("tok.en", { senhaAtual: "antiga123", senhaNova: "nova12345" })).resolves.toEqual(nova);
    expect(chamadas[0]).toMatchObject({
      url: `${API_URL}/me/senha`,
      metodo: "POST",
      corpo: { senhaAtual: "antiga123", senhaNova: "nova12345" },
    });
    expect(chamadas[0].headers.Authorization).toBe("Bearer tok.en");

    responder(200, nova);
    await trocarSenha("tok.en", { senhaNova: "nova12345" });
    expect(chamadas[1].corpo).toEqual({ senhaNova: "nova12345" });
  });

  it("POST /me/senha com resposta sem sessão (API antiga, 204) vira erro: nunca uma sessão inventada", async () => {
    responder(204);
    await expect(trocarSenha("tok.en", { senhaNova: "nova12345" })).rejects.toBeInstanceOf(ApiError);
  });

  it("senha atual errada: 400 com details.senhaAtual (não 401)", async () => {
    responder(400, {
      error: {
        code: "VALIDACAO",
        message: "Dados inválidos",
        details: { senhaAtual: "A senha atual não confere." },
        requestId: "r5",
      },
    });
    await expect(trocarSenha("tok.en", { senhaAtual: "errada12", senhaNova: "nova12345" })).rejects.toMatchObject({
      status: 400,
      details: { senhaAtual: "A senha atual não confere." },
    });
  });
});

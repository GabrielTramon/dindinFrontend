import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "./storage";
import {
  caminhoDoReferrer,
  caminhoInterno,
  confirmarSessaoNoServidor,
  consumirEntrada,
  anunciarEntrada,
  guardarRetorno,
  lerRetorno,
  lerSessao,
  sair,
  salvarSessao,
  sessaoVencida,
  validarSessaoEmSegundoPlano,
} from "./sessao";

/*
  O que estes testes protegem:
  - a sessão só vale com a forma certa e validade no futuro (senão o PDF
    liberaria com lixo no localStorage, ou com token que a API já recusa);
  - o retorno depois de entrar nunca aponta pra fora do site (open redirect).
  A suíte roda em Node: o window é um dublê mínimo, como em storage.test.ts.
*/

function janelaFalsa() {
  const dados = new Map<string, string>();
  return {
    localStorage: {
      getItem: (k: string) => dados.get(k) ?? null,
      setItem: (k: string, v: string) => void dados.set(k, v),
      removeItem: (k: string) => void dados.delete(k),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dados,
  };
}

let janela: ReturnType<typeof janelaFalsa>;
const AGORA = Date.parse("2026-09-24T12:00:00.000Z");
const AMANHA = "2026-09-25T12:00:00.000Z";
const ONTEM = "2026-09-23T12:00:00.000Z";

function gravarCru(chave: string, valor: unknown) {
  janela.dados.set(chave, JSON.stringify(valor));
}

beforeEach(() => {
  janela = janelaFalsa();
  vi.stubGlobal("window", janela);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("lerSessao", () => {
  const valida = { accessToken: "tok.en", expiresAt: AMANHA, email: "ana@email.com" };

  it("devolve a sessão com forma certa e validade no futuro", () => {
    gravarCru(STORAGE_KEYS.sessao, valida);
    expect(lerSessao(AGORA)).toEqual(valida);
  });

  it("recusa forma errada", () => {
    for (const lixo of [
      "texto",
      42,
      [],
      { ...valida, accessToken: "" },
      { ...valida, accessToken: 123 },
      { ...valida, email: "sem-arroba" },
      { accessToken: "tok", expiresAt: AMANHA },
      { ...valida, expiresAt: "não é data" },
    ]) {
      gravarCru(STORAGE_KEYS.sessao, lixo);
      expect(lerSessao(AGORA)).toBeNull();
    }
  });

  it("recusa JSON corrompido e chave ausente", () => {
    expect(lerSessao(AGORA)).toBeNull();
    janela.dados.set(STORAGE_KEYS.sessao, "{quebrado");
    expect(lerSessao(AGORA)).toBeNull();
  });

  it("recusa expiresAt no passado (e no instante exato)", () => {
    gravarCru(STORAGE_KEYS.sessao, { ...valida, expiresAt: ONTEM });
    expect(lerSessao(AGORA)).toBeNull();
    gravarCru(STORAGE_KEYS.sessao, { ...valida, expiresAt: new Date(AGORA).toISOString() });
    expect(lerSessao(AGORA)).toBeNull();
  });

  it("devolve a MESMA referência enquanto nada muda (exigência do useSyncExternalStore)", () => {
    gravarCru(STORAGE_KEYS.sessao, valida);
    const a = lerSessao(AGORA);
    const b = lerSessao(AGORA);
    expect(a).not.toBeNull();
    expect(b).toBe(a);
    gravarCru(STORAGE_KEYS.sessao, { ...valida, accessToken: "outro" });
    expect(lerSessao(AGORA)).not.toBe(a);
  });

  it("descarta chaves a mais que alguém tenha gravado", () => {
    gravarCru(STORAGE_KEYS.sessao, { ...valida, admin: true });
    expect(lerSessao(AGORA)).toEqual(valida);
  });
});

describe("salvarSessao e sair", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(AGORA);
  });

  it("grava a resposta do /auth/verificar só com accessToken, expiresAt e email", () => {
    const ok = salvarSessao({
      accessToken: "tok",
      expiresAt: AMANHA,
      subscriber: { id: "1", email: "ana@email.com", emailVerificadoEm: null, ativo: true },
    });
    expect(ok).toBe(true);
    expect(JSON.parse(janela.dados.get(STORAGE_KEYS.sessao)!)).toEqual({
      accessToken: "tok",
      expiresAt: AMANHA,
      email: "ana@email.com",
    });
  });

  it("não grava sessão vencida", () => {
    expect(salvarSessao({ accessToken: "tok", expiresAt: ONTEM, email: "ana@email.com" })).toBe(false);
    expect(janela.dados.has(STORAGE_KEYS.sessao)).toBe(false);
  });

  it("sair apaga só a sessão", () => {
    salvarSessao({ accessToken: "tok", expiresAt: AMANHA, email: "ana@email.com" });
    gravarCru(STORAGE_KEYS.perfil, { rendaMensal: 2800 });
    sair();
    expect(janela.dados.has(STORAGE_KEYS.sessao)).toBe(false);
    expect(janela.dados.has(STORAGE_KEYS.perfil)).toBe(true);
  });
});

describe("guardarRetorno", () => {
  it("aceita caminho interno, com motivo e e-mail", () => {
    expect(guardarRetorno("/plano/resultado", "pdf", " ana@email.com ")).toBe(true);
    expect(lerRetorno()).toEqual({ caminho: "/plano/resultado", motivo: "pdf", email: "ana@email.com" });
    expect(guardarRetorno("/conta?aba=dados#topo")).toBe(true);
    expect(lerRetorno()).toEqual({ caminho: "/conta?aba=dados#topo" });
  });

  it("recusa caminho externo e não grava", () => {
    for (const externo of [
      "https://golpe.com",
      "//golpe.com",
      "/\\golpe.com",
      "\\\\golpe.com",
      "/\t/golpe.com",
      "/\n/golpe.com",
      "/ /golpe.com",
      "javascript:alert(1)",
      "golpe.com",
      "",
      "/plano//x",
      "/entrar",
      "/entrar#token=abc",
      // as outras telas de entrar também: voltar pra elas depois de entrar seria um laço
      "/criar-conta",
      "/criar-conta?x=1",
      "/esqueci-senha",
      "/redefinir-senha",
      "/redefinir-senha#token=abc",
    ]) {
      expect(guardarRetorno(externo)).toBe(false);
      expect(janela.dados.has(STORAGE_KEYS.retorno)).toBe(false);
    }
  });

  it("lerRetorno revalida o que está gravado (alguém pode ter mexido à mão)", () => {
    gravarCru(STORAGE_KEYS.retorno, { caminho: "//golpe.com" });
    expect(lerRetorno()).toBeNull();
    gravarCru(STORAGE_KEYS.retorno, { caminho: "/plano", motivo: "outro" });
    expect(lerRetorno()).toBeNull();
    gravarCru(STORAGE_KEYS.retorno, "texto");
    expect(lerRetorno()).toBeNull();
  });
});

describe("caminhoInterno e caminhoDoReferrer", () => {
  it("caminhoInterno devolve o próprio caminho ou null", () => {
    expect(caminhoInterno("/plano/resultado")).toBe("/plano/resultado");
    // só a tela de entrar em si fica de fora, não o que começa com o mesmo nome
    expect(caminhoInterno("/entrarx")).toBe("/entrarx");
    expect(caminhoInterno("/conta")).toBe("/conta");
    expect(caminhoInterno(42)).toBeNull();
    expect(caminhoInterno("/" + "a".repeat(600))).toBeNull();
  });

  it("referrer só vale se for do mesmo site", () => {
    const origem = "http://localhost:3700";
    expect(caminhoDoReferrer("http://localhost:3700/plano/resultado?x=1", origem)).toBe("/plano/resultado?x=1");
    expect(caminhoDoReferrer("https://golpe.com/plano/resultado", origem)).toBeNull();
    expect(caminhoDoReferrer("", origem)).toBeNull();
    expect(caminhoDoReferrer("não é url", origem)).toBeNull();
  });
});

describe("recado de entrada", () => {
  it("é consumido uma vez só", () => {
    anunciarEntrada({ email: "ana@email.com", motivo: "pdf", como: "criou" });
    expect(consumirEntrada()).toEqual({ email: "ana@email.com", motivo: "pdf", como: "criou" });
    expect(consumirEntrada()).toBeNull();
  });
});

/*
  O portão do PDF: a sessão local não basta, cada toque confere no servidor.
  O fetch é um dublê que responde o GET /me.
*/
describe("confirmarSessaoNoServidor", () => {
  const CONTA = {
    id: "s1",
    email: "ana@email.com",
    emailVerificadoEm: null,
    ativo: true,
    criadoEm: "2026-09-01T12:00:00.000Z",
    temSenha: true,
  };
  const valida = { accessToken: "tok.en", expiresAt: AMANHA, email: "ana@email.com" };

  function responderMe(status: number, corpo: unknown) {
    const fetchFalso = vi.fn(async () => new Response(JSON.stringify(corpo), { status }));
    vi.stubGlobal("fetch", fetchFalso);
    return fetchFalso;
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AGORA);
  });

  it("sem sessão (ou com lixo) não vai à rede, e o lixo sai", async () => {
    const fetchFalso = responderMe(200, CONTA);
    expect(await confirmarSessaoNoServidor()).toEqual({ tipo: "sem-sessao" });
    gravarCru(STORAGE_KEYS.sessao, { accessToken: "tok", expiresAt: ONTEM, email: "ana@email.com" });
    expect(await confirmarSessaoNoServidor()).toEqual({ tipo: "sem-sessao" });
    expect(janela.dados.has(STORAGE_KEYS.sessao)).toBe(false);
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("com sessão aceita pelo servidor: valida, com a conta e a sessão conferida", async () => {
    gravarCru(STORAGE_KEYS.sessao, valida);
    responderMe(200, CONTA);
    expect(await confirmarSessaoNoServidor()).toEqual({ tipo: "valida", conta: CONTA, sessao: valida });
  });

  it("confere de novo a cada chamada (sem o cache da validação em segundo plano)", async () => {
    gravarCru(STORAGE_KEYS.sessao, valida);
    const fetchFalso = responderMe(200, CONTA);
    await confirmarSessaoNoServidor();
    await confirmarSessaoNoServidor();
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it("sessão falsa (401): expirada e a sessão sai do navegador", async () => {
    gravarCru(STORAGE_KEYS.sessao, { ...valida, accessToken: "inventado" });
    responderMe(401, { error: { code: "NAO_AUTENTICADO", message: "Sessão inválida", requestId: "r" } });
    expect(await confirmarSessaoNoServidor()).toEqual({ tipo: "expirada" });
    expect(janela.dados.has(STORAGE_KEYS.sessao)).toBe(false);
  });

  it("401 não apaga a sessão de quem entrou com outro token enquanto o GET voava", async () => {
    gravarCru(STORAGE_KEYS.sessao, valida);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        gravarCru(STORAGE_KEYS.sessao, { ...valida, accessToken: "novo" });
        return new Response(JSON.stringify({ error: { code: "NAO_AUTENTICADO", message: "x" } }), { status: 401 });
      }),
    );
    expect(await confirmarSessaoNoServidor()).toEqual({ tipo: "expirada" });
    expect(lerSessao()?.accessToken).toBe("novo");
  });

  it("rede ou 5xx: falhou, e a sessão FICA", async () => {
    gravarCru(STORAGE_KEYS.sessao, valida);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const semRede = await confirmarSessaoNoServidor();
    expect(semRede.tipo).toBe("falhou");
    expect(janela.dados.has(STORAGE_KEYS.sessao)).toBe(true);

    responderMe(503, { error: { code: "ERRO_INTERNO", message: "Algo deu errado." } });
    const foraDoAr = await confirmarSessaoNoServidor();
    expect(foraDoAr).toMatchObject({ tipo: "falhou", erro: { status: 503 } });
    expect(janela.dados.has(STORAGE_KEYS.sessao)).toBe(true);
  });
});

/*
  "Sua sessão venceu": a gaveta do PDF só sabe dizer isso se alguém lembrar que
  a sessão caiu sozinha. Quem tira a sessão nem sempre é o toque no botão — a
  validação em segundo plano (ao carregar a página) apaga a recusada antes.
*/
describe("sessaoVencida", () => {
  const CONTA = {
    id: "s1",
    email: "ana@email.com",
    emailVerificadoEm: null,
    ativo: true,
    criadoEm: "2026-09-01T12:00:00.000Z",
    temSenha: true,
  };
  const RECUSA = { error: { code: "NAO_AUTENTICADO", message: "Sua sessão expirou.", requestId: "r" } };
  let seq = 0;
  /** token novo a cada teste: a validação em segundo plano guarda uma resposta por token e por carregamento */
  const sessaoNova = () => ({ accessToken: `tok.vencida.${++seq}`, expiresAt: AMANHA, email: "ana@email.com" });

  function responder(status: number, corpo: unknown) {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(corpo), { status })));
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(AGORA);
    // o recado é do módulo (vale pelo carregamento da página): cada teste começa sem ele
    sair();
  });

  it("sem sessão nenhuma, nunca: null", () => {
    expect(sessaoVencida()).toBeNull();
  });

  it("com sessão válida: null", () => {
    gravarCru(STORAGE_KEYS.sessao, sessaoNova());
    expect(sessaoVencida()).toBeNull();
  });

  it("a validação ao carregar a página recebeu 401 e apagou a sessão: o e-mail fica pro 'Sua sessão venceu'", async () => {
    gravarCru(STORAGE_KEYS.sessao, sessaoNova());
    responder(401, RECUSA);
    expect(await validarSessaoEmSegundoPlano()).toEqual({ tipo: "expirada" });
    expect(lerSessao()).toBeNull();
    expect(janela.dados.has(STORAGE_KEYS.sessao)).toBe(false);
    expect(sessaoVencida()).toEqual({ email: "ana@email.com" });
  });

  it("a conferência do PDF recebeu 401: também", async () => {
    gravarCru(STORAGE_KEYS.sessao, sessaoNova());
    responder(401, RECUSA);
    expect(await confirmarSessaoNoServidor()).toEqual({ tipo: "expirada" });
    expect(sessaoVencida()).toEqual({ email: "ana@email.com" });
  });

  it("validade passada no relógio: vencida, gravada ou já limpa pela validação", async () => {
    gravarCru(STORAGE_KEYS.sessao, { ...sessaoNova(), expiresAt: ONTEM });
    expect(sessaoVencida()).toEqual({ email: "ana@email.com" });
    expect(await validarSessaoEmSegundoPlano()).toEqual({ tipo: "sem-sessao" });
    expect(janela.dados.has(STORAGE_KEYS.sessao)).toBe(false);
    expect(sessaoVencida()).toEqual({ email: "ana@email.com" });
  });

  it("lixo no lugar da sessão não é 'sessão vencida'", async () => {
    gravarCru(STORAGE_KEYS.sessao, { accessToken: "", email: "x" });
    expect(sessaoVencida()).toBeNull();
    await validarSessaoEmSegundoPlano();
    expect(sessaoVencida()).toBeNull();
  });

  it("rede fora ou 5xx não derrubam a sessão, então não há recado", async () => {
    gravarCru(STORAGE_KEYS.sessao, sessaoNova());
    responder(503, { error: { code: "ERRO_INTERNO", message: "Algo deu errado." } });
    expect((await validarSessaoEmSegundoPlano()).tipo).toBe("falhou");
    expect(sessaoVencida()).toBeNull();
  });

  it("entrar de novo apaga o recado; sair por conta própria também", async () => {
    gravarCru(STORAGE_KEYS.sessao, sessaoNova());
    responder(401, RECUSA);
    await validarSessaoEmSegundoPlano();
    expect(sessaoVencida()).not.toBeNull();

    expect(salvarSessao(sessaoNova())).toBe(true);
    expect(sessaoVencida()).toBeNull();
    sair();
    expect(sessaoVencida()).toBeNull();

    gravarCru(STORAGE_KEYS.sessao, sessaoNova());
    await confirmarSessaoNoServidor();
    expect(sessaoVencida()).not.toBeNull();
    sair();
    expect(sessaoVencida()).toBeNull();
  });

  it("401 de um token velho, com outro já gravado no lugar: a sessão nova fica e não há recado", async () => {
    gravarCru(STORAGE_KEYS.sessao, sessaoNova());
    const outra = sessaoNova();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        gravarCru(STORAGE_KEYS.sessao, outra);
        return new Response(JSON.stringify(RECUSA), { status: 401 });
      }),
    );
    expect(await confirmarSessaoNoServidor()).toEqual({ tipo: "expirada" });
    expect(lerSessao()?.accessToken).toBe(outra.accessToken);
    expect(sessaoVencida()).toBeNull();
  });

  it("a conta vale no servidor: nada vence", async () => {
    gravarCru(STORAGE_KEYS.sessao, sessaoNova());
    responder(200, CONTA);
    expect((await validarSessaoEmSegundoPlano()).tipo).toBe("valida");
    expect(sessaoVencida()).toBeNull();
  });
});

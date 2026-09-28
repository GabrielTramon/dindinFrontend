import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumirEntrada, guardarRetorno, lerRetorno, lerSessao } from "@/lib/sessao";
import { STORAGE_KEYS } from "@/lib/storage";
import { concluirEntrada, fraseDeEntrada, lembrarEmail, tokenDoHash } from "./comum";

/*
  O que estes testes protegem:
  - depois de entrar (criar conta, entrar, confirmar e-mail, senha nova), a
    sessão é gravada, o destino sai do retorno UMA vez, o retorno some e o
    toast certo fica pro destino;
  - o e-mail digitado passa de uma tela de entrar pra outra sem ir pra URL;
  - só token com cara de token sai do #hash.
  Roda em Node: window/document são dublês mínimos, como em sessao.test.ts.
*/

function janelaFalsa() {
  const dados = new Map<string, string>();
  return {
    localStorage: {
      getItem: (k: string) => dados.get(k) ?? null,
      setItem: (k: string, v: string) => void dados.set(k, v),
      removeItem: (k: string) => void dados.delete(k),
    },
    location: { origin: "http://localhost:3700" },
    addEventListener: () => {},
    removeEventListener: () => {},
    dados,
  };
}

let janela: ReturnType<typeof janelaFalsa>;
const AGORA = Date.parse("2026-09-24T12:00:00.000Z");

const SESSAO = {
  accessToken: "tok.en",
  expiresAt: "2026-10-24T12:00:00.000Z",
  subscriber: { id: "s1", email: "ana@email.com", emailVerificadoEm: null, ativo: true },
};

beforeEach(() => {
  janela = janelaFalsa();
  vi.stubGlobal("window", janela);
  vi.stubGlobal("document", { referrer: "" });
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(AGORA);
  consumirEntrada();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("concluirEntrada", () => {
  it("grava a sessão, vai pro retorno, limpa o retorno e deixa o toast", () => {
    guardarRetorno("/conta", undefined, "ana@email.com");
    expect(concluirEntrada(SESSAO, "criou")).toEqual({ email: "ana@email.com", destino: "/conta" });
    expect(lerSessao()).toEqual({ accessToken: "tok.en", expiresAt: SESSAO.expiresAt, email: "ana@email.com" });
    expect(lerRetorno()).toBeNull();
    expect(consumirEntrada()).toEqual({ email: "ana@email.com", motivo: undefined, como: "criou" });
  });

  it("retorno pro plano sem plano neste navegador: entrou, mas sem destino (e sem toast perdido)", () => {
    guardarRetorno("/plano/resultado", "pdf");
    expect(concluirEntrada(SESSAO, "redefiniu")).toEqual({ email: "ana@email.com", destino: null });
    expect(lerSessao()).not.toBeNull();
    expect(consumirEntrada()).toBeNull();
  });

  it("sessão que não dá pra gravar (já vencida): null, nada muda", () => {
    guardarRetorno("/conta");
    expect(concluirEntrada({ ...SESSAO, expiresAt: "2026-09-23T12:00:00.000Z" }, "entrou")).toBeNull();
    expect(janela.dados.has(STORAGE_KEYS.sessao)).toBe(false);
    expect(lerRetorno()).toEqual({ caminho: "/conta" });
  });

  it("sem retorno, usa a página de onde a pessoa veio (se for deste site)", () => {
    vi.stubGlobal("document", { referrer: "http://localhost:3700/conta" });
    expect(concluirEntrada(SESSAO, "entrou")?.destino).toBe("/conta");
    vi.stubGlobal("document", { referrer: "https://golpe.com/conta" });
    expect(concluirEntrada(SESSAO, "entrou")?.destino).toBeNull();
  });
});

describe("lembrarEmail", () => {
  it("guarda o e-mail no retorno, mantendo caminho e motivo", () => {
    guardarRetorno("/plano/resultado", "pdf");
    lembrarEmail(" ana@email.com ");
    expect(lerRetorno()).toEqual({ caminho: "/plano/resultado", motivo: "pdf", email: "ana@email.com" });
  });

  it("sem retorno, usa o caminho padrão; e-mail vazio não apaga o que havia", () => {
    lembrarEmail("ana@email.com", "/conta");
    expect(lerRetorno()).toEqual({ caminho: "/conta", email: "ana@email.com" });
    lembrarEmail("   ");
    expect(lerRetorno()).toEqual({ caminho: "/conta", email: "ana@email.com" });
  });

  it("sem retorno nem caminho, guarda com o plano de destino (o mesmo de quem entra sem retorno)", () => {
    lembrarEmail("ana@email.com");
    expect(lerRetorno()).toEqual({ caminho: "/plano/resultado", email: "ana@email.com" });
  });

  it("sem retorno, a página de onde a pessoa veio vale antes do plano", () => {
    vi.stubGlobal("document", { referrer: "http://localhost:3700/conta" });
    lembrarEmail("ana@email.com");
    expect(lerRetorno()).toEqual({ caminho: "/conta", email: "ana@email.com" });
  });
});

describe("fraseDeEntrada", () => {
  it("uma frase pra cada jeito de entrar", () => {
    expect(fraseDeEntrada({ email: "ana@email.com", como: "criou" })).toBe(
      "Conta criada. Mandamos um link pra confirmar seu e-mail.",
    );
    expect(fraseDeEntrada({ email: "ana@email.com", como: "confirmou" })).toBe(
      "E-mail confirmado. Você entrou como ana@email.com.",
    );
    expect(fraseDeEntrada({ email: "ana@email.com", como: "redefiniu" })).toBe(
      "Senha nova salva. Você entrou como ana@email.com.",
    );
    expect(fraseDeEntrada({ email: "ana@email.com" })).toBe("Você entrou como ana@email.com.");
    expect(fraseDeEntrada({ email: "ana@email.com", motivo: "pdf" })).toBe(
      "Você entrou. O PDF já está liberado lá embaixo.",
    );
  });
});

describe("tokenDoHash", () => {
  it("só token com cara de token", () => {
    const token = "a".repeat(43);
    expect(tokenDoHash(`#token=${token}`)).toBe(token);
    expect(tokenDoHash(`#outro=1&token=${token}`)).toBe(token);
    expect(tokenDoHash(`token=${token}`)).toBeNull();
    expect(tokenDoHash("#token=curto")).toBeNull();
    expect(tokenDoHash(`#token=${"a".repeat(20)}<script>`)).toBeNull();
    expect(tokenDoHash("")).toBeNull();
  });
});

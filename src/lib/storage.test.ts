import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readJSON, removeKey, STORAGE_KEYS, subscribeStorage, writeJSON } from "./storage";

/*
  A suíte roda em Node, sem DOM: o window aqui é um dublê mínimo.
  O que estes testes protegem é o motivo de o emissor existir — a tela do
  resultado lê por useSyncExternalStore e precisa se redesenhar depois de uma
  escrita feita NESTA aba, coisa que o evento "storage" do navegador não avisa.
*/

function janelaFalsa() {
  const dados = new Map<string, string>();
  const ouvintes = new Map<string, Set<() => void>>();
  return {
    localStorage: {
      getItem: (k: string) => dados.get(k) ?? null,
      setItem: (k: string, v: string) => void dados.set(k, v),
      removeItem: (k: string) => void dados.delete(k),
    },
    addEventListener: (evento: string, fn: () => void) => {
      if (!ouvintes.has(evento)) ouvintes.set(evento, new Set());
      ouvintes.get(evento)!.add(fn);
    },
    removeEventListener: (evento: string, fn: () => void) => void ouvintes.get(evento)?.delete(fn),
    /** simula outra aba mexendo no mesmo domínio */
    disparaDeOutraAba: () => {
      for (const fn of ouvintes.get("storage") ?? []) fn();
    },
    dados,
  };
}

let janela: ReturnType<typeof janelaFalsa>;

beforeEach(() => {
  janela = janelaFalsa();
  vi.stubGlobal("window", janela);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("storage", () => {
  it("grava e lê JSON", () => {
    writeJSON(STORAGE_KEYS.perfil, { rendaMensal: 3000 });
    expect(readJSON(STORAGE_KEYS.perfil, null)).toEqual({ rendaMensal: 3000 });
  });

  it("chave ausente e JSON corrompido devolvem o fallback", () => {
    expect(readJSON("dindin:nada", "padrão")).toBe("padrão");
    janela.dados.set(STORAGE_KEYS.perfil, "{isso não é json");
    expect(readJSON(STORAGE_KEYS.perfil, null)).toBe(null);
  });

  it("avisa o assinante na PRÓPRIA aba, que é o que o evento do navegador não faz", () => {
    const aviso = vi.fn();
    subscribeStorage(aviso);

    writeJSON(STORAGE_KEYS.perfil, { ritmo: "acelerado" });
    expect(aviso).toHaveBeenCalledTimes(1);

    removeKey(STORAGE_KEYS.perfil);
    expect(aviso).toHaveBeenCalledTimes(2);
  });

  it("avisa também quando outra aba mexe", () => {
    const aviso = vi.fn();
    subscribeStorage(aviso);
    janela.disparaDeOutraAba();
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it("cancelar a assinatura para os dois caminhos de aviso", () => {
    const aviso = vi.fn();
    const cancelar = subscribeStorage(aviso);
    cancelar();

    writeJSON(STORAGE_KEYS.organizacao, { grupos: [] });
    janela.disparaDeOutraAba();
    expect(aviso).not.toHaveBeenCalled();
  });

  it("sem window (SSR ou navegador que bloqueia): não quebra e não grava", () => {
    vi.stubGlobal("window", undefined);
    const aviso = vi.fn();
    const cancelar = subscribeStorage(aviso);

    expect(writeJSON(STORAGE_KEYS.perfil, { a: 1 })).toBe(false);
    expect(readJSON(STORAGE_KEYS.perfil, "vazio")).toBe("vazio");
    expect(() => removeKey(STORAGE_KEYS.perfil)).not.toThrow();
    expect(() => cancelar()).not.toThrow();
    expect(aviso).not.toHaveBeenCalled();
  });

  it("as três chaves são distintas e versionadas", () => {
    const chaves = Object.values(STORAGE_KEYS);
    expect(new Set(chaves).size).toBe(chaves.length);
    for (const chave of chaves) expect(chave).toMatch(/^dindin:[a-z]+:v\d+$/);
  });
});

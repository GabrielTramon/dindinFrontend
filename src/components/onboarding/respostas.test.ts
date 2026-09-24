import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/lib/storage";
import { holeriteDasRespostas, lerRespostasSalvas, montarPerfil } from "./respostas";

/*
  A suíte roda em Node, sem DOM: o window aqui é um dublê com só o localStorage.
*/

function guardar(dados: Record<string, unknown>) {
  const mapa = new Map(Object.entries(dados).map(([k, v]) => [k, JSON.stringify(v)]));
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => mapa.get(k) ?? null,
      setItem: (k: string, v: string) => void mapa.set(k, v),
      removeItem: (k: string) => void mapa.delete(k),
    },
  });
}

describe("lerRespostasSalvas", () => {
  beforeEach(() => guardar({}));
  afterEach(() => vi.unstubAllGlobals());

  it("sem rascunho, abre com o perfil salvo", () => {
    guardar({ [STORAGE_KEYS.perfil]: { rendaMensal: 4000, ritmo: "acelerado" } });
    const salvas = lerRespostasSalvas();
    expect(salvas.emAndamento).toBe(false);
    expect(salvas.respostas.rendaMensal).toBe(4000);
    expect(salvas.respostas.ritmo).toBe("acelerado");
  });

  /*
    A regressão: um rascunho gravado antes de a pessoa escolher o ritmo (ou editar o
    "Guardar") na tela do plano desfazia essa escolha em silêncio ao concluir o onboarding.
  */
  it("ritmo e Guardar editado vêm sempre do perfil, mesmo com rascunho mais velho", () => {
    guardar({
      [STORAGE_KEYS.rascunho]: { rendaMensal: 3000, idade: 30 },
      [STORAGE_KEYS.perfil]: { rendaMensal: 4000, ritmo: "acelerado", aporteEscolhido: 700 },
    });
    const { respostas, emAndamento } = lerRespostasSalvas();
    expect(emAndamento).toBe(true);
    // o resto do rascunho continua valendo: são respostas em andamento
    expect(respostas.rendaMensal).toBe(3000);
    expect(respostas.idade).toBe(30);
    expect(respostas.ritmo).toBe("acelerado");
    expect(respostas.aporteEscolhido).toBe(700);
  });

  it("perfil sem ritmo zera o ritmo velho do rascunho", () => {
    guardar({
      [STORAGE_KEYS.rascunho]: { rendaMensal: 3000, ritmo: "leve", aporteEscolhido: 100 },
      [STORAGE_KEYS.perfil]: { rendaMensal: 3000 },
    });
    const { respostas } = lerRespostasSalvas();
    expect(respostas.ritmo).toBeUndefined();
    expect(respostas.aporteEscolhido).toBeUndefined();
  });

  it("sem perfil, o rascunho vale inteiro (e passa pela allow-list)", () => {
    guardar({ [STORAGE_KEYS.rascunho]: { rendaMensal: 3000, ritmo: "leve", campoEstranho: 1 } });
    const { respostas, emAndamento } = lerRespostasSalvas();
    expect(emAndamento).toBe(true);
    expect(respostas.ritmo).toBe("leve");
    expect(respostas).not.toHaveProperty("campoEstranho");
  });
});

describe("salário bruto de PJ", () => {
  const pj = { rendaInformada: "bruta", salarioBruto: 8000, rendaMensal: 6040.64, tipoRenda: "pj" } as const;

  it("não passa pela tabela de CLT", () => {
    expect(holeriteDasRespostas(pj)).toBeNull();
    expect(holeriteDasRespostas({ ...pj, tipoRenda: "clt" })).not.toBeNull();
  });

  it("o perfil sai com o valor digitado como renda líquida, sem INSS nem IRRF", () => {
    const perfil = montarPerfil(pj);
    expect(perfil.rendaMensal).toBe(8000);
    expect(perfil.rendaInformada).toBe("liquida");
    expect(perfil.salarioBruto).toBeUndefined();
    expect(perfil.competenciaTabela).toBeUndefined();
  });

  it("CLT continua com o líquido estimado", () => {
    const perfil = montarPerfil({ ...pj, tipoRenda: "clt" });
    expect(perfil.rendaMensal).toBeLessThan(8000);
    expect(perfil.rendaInformada).toBe("bruta");
    expect(perfil.salarioBruto).toBe(8000);
  });
});

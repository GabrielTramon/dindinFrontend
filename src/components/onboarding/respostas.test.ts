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

describe("vales", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("passam pela allow-list: tipo desconhecido sai, valor em branco fica (rascunho)", () => {
    guardar({
      [STORAGE_KEYS.rascunho]: {
        rendaMensal: 3000,
        beneficios: [{ tipo: "refeicao", valor: 600, extra: 1 }, { tipo: "gympass", valor: 100 }, { tipo: "outro", nome: "Creche" }, "lixo"],
      },
    });
    expect(lerRespostasSalvas().respostas.beneficios).toEqual([
      { tipo: "refeicao", nome: undefined, valor: 600 },
      { tipo: "outro", nome: "Creche", valor: undefined },
    ]);
  });

  it("o VT de quem informou o bruto sai do líquido (até 6%); sem VT, o líquido de sempre", () => {
    const clt = { rendaInformada: "bruta", salarioBruto: 3000, tipoRenda: "clt" } as const;
    const sem = holeriteDasRespostas(clt)!;
    const com = holeriteDasRespostas({ ...clt, beneficios: [{ tipo: "transporte", valor: 400 }] })!;
    expect(com.valeTransporte).toBe(180);
    expect(com.liquido).toBeCloseTo(sem.liquido - 180, 2);
    expect(montarPerfil({ ...clt, beneficios: [{ tipo: "transporte", valor: 400 }] }).rendaMensal).toBe(com.liquido);
    // VR não mexe no holerite
    expect(holeriteDasRespostas({ ...clt, beneficios: [{ tipo: "refeicao", valor: 400 }] })).toEqual(sem);
  });

  it("no perfil: o nome só fica no 'outro', aparado; lista vazia vira ausente", () => {
    const perfil = montarPerfil({
      rendaMensal: 3000,
      beneficios: [
        { tipo: "refeicao", nome: "lixo", valor: 600 },
        { tipo: "outro", nome: "  Creche ", valor: 200 },
      ],
    });
    expect(perfil.beneficios).toEqual([
      { tipo: "refeicao", nome: undefined, valor: 600 },
      { tipo: "outro", nome: "Creche", valor: 200 },
    ]);
    expect(montarPerfil({ rendaMensal: 3000, beneficios: [] }).beneficios).toBeUndefined();
  });
});

describe("13º", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("passa pela allow-list só como booleano", () => {
    guardar({ [STORAGE_KEYS.rascunho]: { tipoRenda: "clt", decimoTerceiro: true } });
    expect(lerRespostasSalvas().respostas.decimoTerceiro).toBe(true);
    guardar({ [STORAGE_KEYS.rascunho]: { tipoRenda: "clt", decimoTerceiro: "sim" } });
    expect(lerRespostasSalvas().respostas.decimoTerceiro).toBeUndefined();
  });

  it("informal sai do perfil sem a resposta (um 'sim' de quando era CLT não vale)", () => {
    expect(montarPerfil({ tipoRenda: "clt", decimoTerceiro: true }).decimoTerceiro).toBe(true);
    expect(montarPerfil({ tipoRenda: "informal", decimoTerceiro: true }).decimoTerceiro).toBeUndefined();
  });
});

describe("potes do que já está guardado pra meta, lidos do armazenamento", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("passam pela allow-list: campos certos ficam, lixo sai, e a chave ausente continua ausente", () => {
    guardar({
      [STORAGE_KEYS.perfil]: {
        guardado: 20000,
        meta: {
          tipo: "casa",
          valorAlvo: 33000,
          guardados: [
            { id: "a", nome: "CDB", valor: 5000, rendimentoMensal: 0.01, extra: "x" },
            { id: "", nome: "sem id", valor: 10 },
            { id: "b", valor: 100 },
            "lixo",
          ],
        },
      },
    });
    const { respostas } = lerRespostasSalvas();
    expect(respostas.meta?.guardados).toEqual([
      { id: "a", nome: "CDB", valor: 5000, rendimentoMensal: 0.01 },
      { id: "b", nome: "Já guardado", valor: 100 },
    ]);
    guardar({ [STORAGE_KEYS.perfil]: { meta: { tipo: "casa", valorAlvo: 1 } } });
    expect("guardados" in (lerRespostasSalvas().respostas.meta ?? {})).toBe(false);
  });
});

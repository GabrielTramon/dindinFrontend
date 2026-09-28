import { describe, expect, it } from "vitest";
import { erroNaLinha, faltaNosBeneficios, PASSOS, problemaDosBeneficios, type PassoId } from "./passos";
import type { Respostas } from "./respostas";

const passo = (id: PassoId) => {
  const p = PASSOS.find((x) => x.id === id);
  if (!p) throw new Error(`passo ${id} não existe`);
  return p;
};

describe("passo da renda no modo bruto", () => {
  const renda = passo("rendaMensal");

  it("bruto acima de R$ 1 mi dá erro já na pergunta 1, mesmo com o líquido abaixo do teto", () => {
    const r: Respostas = { rendaInformada: "bruta", salarioBruto: 1_200_000, rendaMensal: 870_192.36 };
    expect(renda.valido(r)).toBe(false);
    expect(renda.erro?.(r)).toBe("Confere esse valor? Está muito alto");
  });

  it("bruto dentro do teto passa", () => {
    const r: Respostas = { rendaInformada: "bruta", salarioBruto: 5000, rendaMensal: 4100 };
    expect(renda.valido(r)).toBe(true);
    expect(renda.erro?.(r)).toBeUndefined();
  });
});

describe("vales na pergunta da renda", () => {
  const renda = passo("rendaMensal");
  const base: Respostas = { rendaMensal: 3000 };

  it("são opcionais: sem nenhum, a pergunta é a de sempre", () => {
    expect(renda.valido(base)).toBe(true);
    expect(renda.valido({ ...base, beneficios: [] })).toBe(true);
  });

  it("linha sem valor segura o Continuar e diz o que falta, sem virar erro do salário", () => {
    const r: Respostas = { ...base, beneficios: [{ tipo: "refeicao" }] };
    expect(renda.valido(r)).toBe(false);
    expect(renda.erro?.(r)).toBeUndefined();
    expect(problemaDosBeneficios(r)).toBeUndefined();
    expect(faltaNosBeneficios(r)).toBe("Falta dizer quanto vem de Vale-refeição.");
    expect(faltaNosBeneficios({ ...base, beneficios: [{ tipo: "outro", nome: "" }] })).toBe(
      "Falta o nome e o valor do outro benefício.",
    );
  });

  it("'outro' com valor e sem nome é erro e aponta o campo do nome", () => {
    const r: Respostas = { ...base, beneficios: [{ tipo: "refeicao", valor: 600 }, { tipo: "outro", nome: " ", valor: 100 }] };
    expect(renda.valido(r)).toBe(false);
    const problema = problemaDosBeneficios(r);
    expect(problema?.mensagem).toBe("Outro benefício: dê um nome pra esse benefício");
    expect(erroNaLinha(problema?.caminho)).toEqual({ indice: 1, campo: "nome" });
  });

  it("vale com valor 0 é erro no campo do valor", () => {
    const problema = problemaDosBeneficios({ ...base, beneficios: [{ tipo: "transporte", valor: 0 }] });
    expect(problema?.mensagem).toBe("Vale-transporte: o valor precisa ser maior que zero");
    expect(erroNaLinha(problema?.caminho)).toEqual({ indice: 0, campo: "valor" });
  });

  it("vales completos liberam o Continuar", () => {
    const r: Respostas = { ...base, beneficios: [{ tipo: "refeicao", valor: 600 }, { tipo: "outro", nome: "Creche", valor: 200 }] };
    expect(renda.valido(r)).toBe(true);
  });
});

describe("13º no passo do tipo de renda", () => {
  const tipo = passo("tipoRenda");

  it("CLT e PJ precisam responder; o Continuar espera e diz o que falta", () => {
    for (const tipoRenda of ["clt", "pj"] as const) {
      expect(tipo.valido({ tipoRenda })).toBe(false);
      expect(tipo.falta?.({ tipoRenda })).toBe("Falta dizer se o 13º entra no plano.");
      expect(tipo.valido({ tipoRenda, decimoTerceiro: true })).toBe(true);
      expect(tipo.valido({ tipoRenda, decimoTerceiro: false })).toBe(true);
    }
  });

  it("informal não é perguntado", () => {
    expect(tipo.valido({ tipoRenda: "informal" })).toBe(true);
    expect(tipo.falta?.({ tipoRenda: "informal" })).toBeUndefined();
  });
});

describe("passo da idade", () => {
  const idade = passo("idade");

  it("um dígito entre 1 e 9 é preenchimento em andamento, não erro", () => {
    expect(idade.erro?.({ idade: 2 })).toBeUndefined();
    expect(idade.valido({ idade: 2 })).toBe(false);
  });

  it("0 mostra o mínimo em vez de travar o Continuar calado", () => {
    expect(idade.erro?.({ idade: 0 })).toBe("A partir de 14 anos");
  });

  it("aceita até 100, o mesmo teto do slider", () => {
    expect(idade.valido({ idade: 85 })).toBe(true);
    expect(idade.valido({ idade: 100 })).toBe(true);
    expect(idade.erro?.({ idade: 101 })).toBe("Confere a idade?");
  });
});

describe("passo dos gastos", () => {
  const gastos = passo("gastosFixos");

  it("'Outro gasto' com valor e sem nome explica o que falta e aponta o campo do nome", () => {
    const r: Respostas = { gastosFixos: [{ categoria: "mercado", valor: 450 }, { categoria: "outro", nome: "  ", valor: 100 }] };
    expect(gastos.valido(r)).toBe(false);
    expect(gastos.erro?.(r)).toBe("Outro gasto: dê um nome pra esse gasto");
    expect(erroNaLinha(gastos.campoDoErro?.(r))).toEqual({ indice: 1, campo: "nome" });
  });

  it("valor 0 cita a linha pelo nome da categoria e aponta o valor dela", () => {
    const r: Respostas = { gastosFixos: [{ categoria: "outro", nome: "Academia", valor: 100 }, { categoria: "mercado", valor: 0 }] };
    expect(gastos.erro?.(r)).toBe("Mercado: o valor precisa ser maior que zero");
    expect(erroNaLinha(gastos.campoDoErro?.(r))).toEqual({ indice: 1, campo: "valor" });
  });

  it("o erro de uma linha aparece mesmo com outra linha ainda sem valor", () => {
    const r: Respostas = { gastosFixos: [{ categoria: "mercado", valor: 0 }, { categoria: "internet" }] };
    expect(erroNaLinha(gastos.campoDoErro?.(r))).toEqual({ indice: 0, campo: "valor" });
  });

  it("linha sem valor não é erro, mas o Continuar travado diz o que falta", () => {
    const semValor: Respostas = { gastosFixos: [{ categoria: "mercado" }] };
    expect(gastos.erro?.(semValor)).toBeUndefined();
    expect(gastos.valido(semValor)).toBe(false);
    expect(gastos.falta?.(semValor)).toBe("Falta dizer quanto sai em Mercado.");

    const outroVazio: Respostas = { gastosFixos: [{ categoria: "outro", nome: "" }] };
    expect(gastos.falta?.(outroVazio)).toBe("Falta o nome e o valor do outro gasto.");
  });

  it("'Não tenho nenhum' ([]) é resposta válida", () => {
    expect(gastos.valido({ gastosFixos: [] })).toBe(true);
    expect(gastos.valido({})).toBe(false);
  });
});

describe("passo das dívidas", () => {
  const dividas = passo("dividas");

  it("saldo sem tipo pede o tipo da dívida certa e aponta os chips dela", () => {
    const r: Respostas = { dividas: [{ tipo: "emprestimo", saldo: 3000 }, { saldo: 1500 }] };
    expect(dividas.valido(r)).toBe(false);
    expect(dividas.erro?.(r)).toBe("Escolha o tipo da dívida 2");
    expect(erroNaLinha(dividas.campoDoErro?.(r))).toEqual({ indice: 1, campo: "tipo" });
  });

  it("saldo 0 cita o número da dívida e aponta o saldo", () => {
    const r: Respostas = { dividas: [{ tipo: "emprestimo", saldo: 3000 }, { tipo: "rotativo", saldo: 0 }] };
    expect(dividas.erro?.(r)).toBe("Dívida 2: o saldo precisa ser maior que zero");
    expect(erroNaLinha(dividas.campoDoErro?.(r))).toEqual({ indice: 1, campo: "saldo" });
  });

  it("dívida sem saldo não é erro, mas diz o que falta", () => {
    expect(dividas.erro?.({ dividas: [{}] })).toBeUndefined();
    expect(dividas.falta?.({ dividas: [{}] })).toBe("Falta escolher o tipo e dizer quanto você deve na dívida 1.");
    expect(dividas.falta?.({ dividas: [{ tipo: "rotativo" }] })).toBe("Falta dizer quanto você deve na dívida 1.");
  });
});

describe("passo da meta", () => {
  const meta = passo("meta");

  it("'Outro' sem nome aponta o campo do nome, não o do valor", () => {
    const r: Respostas = { meta: { tipo: "outro", nome: "", valorAlvo: 10_000 } };
    expect(meta.erro?.(r)).toBe("Dê um nome pra essa meta");
    expect(meta.campoDoErro?.(r)).toEqual(["nome"]);
  });
});

/*
  Quem tem algo guardado responde se isso entra na meta: sem resposta o
  Continuar não libera e a linha diz o que falta. [] ("não") é resposta.
*/
describe("passo da meta: o que já está guardado entra nela?", () => {
  const meta = passo("meta");
  const casa = { tipo: "casa" as const, valorAlvo: 33000 };

  it("com guardado e sem resposta: não libera, e diz o que falta", () => {
    const r: Respostas = { guardado: 20000, meta: casa };
    expect(meta.valido(r)).toBe(false);
    expect(meta.erro?.(r)).toBeUndefined();
    expect(meta.falta?.(r)).toBe("Falta dizer se o que você já tem guardado entra nessa meta.");
  });

  it("'não' ([]) e um valor são respostas", () => {
    expect(meta.valido({ guardado: 20000, meta: { ...casa, guardados: [] } })).toBe(true);
    expect(
      meta.valido({ guardado: 20000, meta: { ...casa, guardados: [{ id: "a", nome: "Já guardado", valor: 11600, rendimentoMensal: 0.008 }] } }),
    ).toBe(true);
  });

  it("sem nada guardado, não há pergunta", () => {
    expect(meta.valido({ guardado: 0, meta: casa })).toBe(true);
    expect(meta.falta?.({ guardado: 0, meta: casa })).toBeUndefined();
  });
});

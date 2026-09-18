import { describe, expect, it } from "vitest";
import { projetarMeta, SLUG_GRUPO_SISTEMA, type Grupo, type Meta } from "@/domain";
import { montarSistema, paraGuardado, type Guardado } from "./usar-organizacao";

/*
  O contrato dos dois lados da gravação. O hook em si precisa de React e de
  localStorage; estas duas funções são puras, e é nelas que mora o bug que a
  pessoa via: o "Guardar" se refaz a cada render a partir do que está gravado,
  então tudo o que ela escreve dentro dele e não é gravado some sozinho.
*/

const VAZIO: Guardado = { grupos: [] };

/** o ciclo de verdade: a tela edita a lista → grava → a lista é remontada */
function daIdaEVolta(guardado: Guardado, editar: (lista: Grupo[]) => Grupo[], degrauDeMetas = false) {
  const antes = [montarSistema(guardado, 500, degrauDeMetas), ...guardado.grupos];
  const gravado = paraGuardado(guardado, editar(antes), degrauDeMetas);
  // passa pelo JSON de propósito: é o que apaga as chaves `undefined`
  const relido = JSON.parse(JSON.stringify(gravado)) as Guardado;
  return [montarSistema(relido, 500, degrauDeMetas), ...(relido.grupos ?? [])];
}

/** o mesmo que o `definirRendimento` do editor faz: undefined APAGA a chave */
const comRendimento = (taxa: number | undefined) => (lista: Grupo[]) =>
  lista.map((g) => {
    if (!g.doSistema) return g;
    const novo: Grupo = { ...g };
    if (taxa === undefined) delete novo.rendimentoMensal;
    else novo.rendimentoMensal = taxa;
    return novo;
  });

describe("montarSistema", () => {
  it("nasce sem rendimento quando nada foi gravado", () => {
    expect(montarSistema(VAZIO, 500, false).rendimentoMensal).toBeUndefined();
  });

  it("veste a taxa gravada", () => {
    expect(montarSistema({ grupos: [], rendimentoDoSistema: 0.008 }, 500, false).rendimentoMensal).toBe(
      0.008,
    );
  });

  it("o valor é sempre o aporte do plano, nunca o gravado", () => {
    expect(montarSistema({ grupos: [], rendimentoDoSistema: 0.008 }, 730, false).valor).toBe(730);
  });
});

describe("rendimento digitado no 'Guardar'", () => {
  it("sobrevive à ida e volta — era o que sumia ao sair do campo", () => {
    const depois = daIdaEVolta(VAZIO, comRendimento(0.008));
    expect(depois[0].id).toBe(SLUG_GRUPO_SISTEMA);
    expect(depois[0].rendimentoMensal).toBe(0.008);
  });

  it("desligar a caixinha apaga a taxa, em vez de deixá-la rendendo escondida", () => {
    const comTaxa: Guardado = { grupos: [], rendimentoDoSistema: 0.008 };
    expect(daIdaEVolta(comTaxa, comRendimento(undefined))[0].rendimentoMensal).toBeUndefined();
  });

  it("não atrapalha o que já era gravado: itens e 'entra na minha meta'", () => {
    const depois = daIdaEVolta(VAZIO, (lista) =>
      lista.map((g) =>
        g.doSistema
          ? { ...g, contaParaMeta: true, rendimentoMensal: 0.01, itens: [{ id: "i1", nome: "CDB", valor: 200 }] }
          : g,
      ),
    );
    expect(depois[0].contaParaMeta).toBe(true);
    expect(depois[0].itens).toEqual([{ id: "i1", nome: "CDB", valor: 200 }]);
    expect(depois[0].rendimentoMensal).toBe(0.01);
  });

  it("o rendimento do grupo da pessoa continua sobrevivendo", () => {
    const meu: Grupo = {
      id: "g1",
      nome: "Investimento",
      icone: "PiggyBank",
      valor: 300,
      contaParaMeta: true,
      rendimentoMensal: 0.009,
      itens: [],
    };
    expect(daIdaEVolta({ grupos: [meu] }, (l) => l)[1].rendimentoMensal).toBe(0.009);
  });
});

describe("a taxa do 'Guardar' chega na projeção da meta", () => {
  const meta: Meta = { tipo: "outro", valorAlvo: 20000 };

  it("com rendimento, a meta fecha antes", () => {
    // degrau de metas: o "Guardar" já conta sozinho, e o aporte do plano não é somado de novo
    const [sistema] = daIdaEVolta(VAZIO, comRendimento(0.008), true);
    const comTaxa = projetarMeta(meta, [sistema], 0, new Date(2026, 0, 1));
    const semTaxa = projetarMeta(meta, [{ ...sistema, rendimentoMensal: undefined }], 0, new Date(2026, 0, 1));

    expect(sistema.contaParaMeta).toBe(true);
    expect(comTaxa.meses).not.toBeNull();
    expect(comTaxa.meses!).toBeLessThan(semTaxa.meses!);
    expect(comTaxa.semRendimento).toBe(semTaxa.meses);
  });
});

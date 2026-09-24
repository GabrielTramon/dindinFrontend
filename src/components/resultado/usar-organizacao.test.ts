import { describe, expect, it } from "vitest";
import {
  ajustarProporcionalmente,
  gerarPlano,
  limitesDoDivisor,
  outrosPotesQueCabem,
  pctDoGuardar,
  projetarMeta,
  repartirEmReaisInteiros,
  respostaDoPlano,
  simularRitmos,
  SLUG_GRUPO_SISTEMA,
  textosPote,
  type Grupo,
  type Meta,
  type Perfil,
} from "@/domain";
import {
  itensPassamDe,
  livreQueConta,
  maxDoItem,
  poteComValor,
  recadoDoRendimento,
  restanteDoPote,
  tetoEmReais,
  valorDoPoteNovo,
} from "./pote-comum";
import {
  interpretarGuardado,
  montarGrupos,
  montarSistema,
  paraGuardado,
  type Guardado,
} from "./usar-organizacao";
import { gruposComRitmo, perfilComRitmo } from "./usar-ritmo";

/*
  O contrato dos dois lados da gravação. O hook em si precisa de React e de
  localStorage; estas duas funções são puras, e é nelas que mora o bug que a
  pessoa via: o "Guardar" se refaz a cada render a partir do que está gravado,
  então tudo o que ela escreve dentro dele e não é gravado some sozinho.
*/

const VAZIO: Guardado = { grupos: [] };

const arredondarReais = (v: number) => Math.round(v * 100) / 100;

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

/*
  A divisão em PORCENTAGEM sobre um formato que guarda reais: os potes gravam
  junto a `baseReferencia` (a sobra da hora) e, na leitura, voltam na mesma %
  da sobra de hoje.
*/

const perfilA: Perfil = {
  rendaMensal: 2800,
  tipoRenda: "clt",
  idade: 24,
  moradia: "dividido",
  custoMoradia: 700,
  gastosFixos: [
    { categoria: "mercado", valor: 450 },
    { categoria: "transporte_publico", valor: 200 },
    { categoria: "celular", valor: 90 },
    { categoria: "academia", valor: 120 },
    { categoria: "streaming", valor: 40 },
  ],
  dividas: [{ tipo: "rotativo", saldo: 1500 }],
  guardado: 1000,
  meta: { tipo: "viagem", valorAlvo: 6000 },
};

/** o perfil do print do dono: sobra R$ 1.323 e um "Guardar" antigo de R$ 1.323 (R$ 0 livre) */
const perfilDoPrint: Perfil = {
  rendaMensal: 1500,
  tipoRenda: "clt",
  idade: 22,
  moradia: "pais",
  custoMoradia: 0,
  gastosFixos: [
    { categoria: "celular", valor: 77 },
    { categoria: "academia", valor: 100 },
  ],
  dividas: [],
  guardado: 500,
  aporteEscolhido: 1323,
};

const pote = (id: string, valor: number, itens: Grupo["itens"] = []): Grupo => ({
  id,
  nome: id,
  icone: "Tag",
  valor,
  contaParaMeta: false,
  itens,
});

const somaCentavos = (grupos: Grupo[]) => grupos.reduce((acc, g) => acc + Math.round(g.valor * 100), 0);

describe("interpretarGuardado", () => {
  it("lê a baseReferencia gravada", () => {
    expect(interpretarGuardado({ grupos: [], baseReferencia: 1200 }).baseReferencia).toBe(1200);
  });

  it("dado antigo (sem baseReferencia) continua lendo, sem referência", () => {
    const g = interpretarGuardado({ grupos: [pote("namoro", 120)] });
    expect(g.baseReferencia).toBeUndefined();
    expect(g.grupos).toHaveLength(1);
  });

  it("lixo na baseReferencia é ignorado", () => {
    expect(interpretarGuardado({ grupos: [], baseReferencia: "1200" }).baseReferencia).toBeUndefined();
    expect(interpretarGuardado({ grupos: [], baseReferencia: -5 }).baseReferencia).toBeUndefined();
    expect(interpretarGuardado({ grupos: [], baseReferencia: Number.NaN }).baseReferencia).toBeUndefined();
    expect(interpretarGuardado("lixo")).toEqual({ grupos: [] });
  });
});

describe("montarGrupos: reescala na leitura", () => {
  it("sobra subiu: os potes crescem na mesma %", () => {
    const guardado: Guardado = { grupos: [pote("namoro", 120), pote("casa", 240)], baseReferencia: 1200 };
    const [sistema, namoro, casa] = montarGrupos(guardado, 840, false, 1500);
    expect(sistema.valor).toBe(840);
    expect(namoro.valor).toBe(150);
    expect(casa.valor).toBe(300);
  });

  it("sobra desceu: os potes encolhem na mesma %, com os itens junto e sem passar do pote", () => {
    const guardado: Guardado = {
      grupos: [pote("namoro", 300, [{ id: "i1", nome: "Jantar", valor: 200 }])],
      baseReferencia: 1500,
    };
    const [, namoro] = montarGrupos(guardado, 0, false, 1200);
    expect(namoro.valor).toBe(240);
    expect(namoro.itens[0].valor).toBe(160);
    expect(restanteDoPote(namoro)).toBe(80);
  });

  it("sem baseReferencia (dado antigo) não reescala: vale a base atual", () => {
    const guardado: Guardado = { grupos: [pote("namoro", 120)] };
    expect(montarGrupos(guardado, 0, false, 1500)[1].valor).toBe(120);
  });

  it("modo corte (base ≤ 0) não reescala nem apaga", () => {
    const guardado: Guardado = { grupos: [pote("namoro", 120)], baseReferencia: 1200 };
    expect(montarGrupos(guardado, 0, false, 0)[1].valor).toBe(120);
    expect(montarGrupos(guardado, 0, false, -300)[1].valor).toBe(120);
  });

  it("ida e volta: 1.323 → 1.200 → 1.323 devolve os mesmos reais (1 centavo de tolerância)", () => {
    const original = [pote("a", 662), pote("b", 300.33), pote("c", 99.99)];
    const gravado1: Guardado = { grupos: original, baseReferencia: 1323 };
    const lido1200 = montarGrupos(gravado1, 0, false, 1200);
    // a tela regrava com a base de agora
    const gravado2 = JSON.parse(JSON.stringify(paraGuardado(gravado1, lido1200, false, 1200))) as Guardado;
    expect(gravado2.baseReferencia).toBe(1200);
    const deVolta = montarGrupos(gravado2, 0, false, 1323).slice(1);
    deVolta.forEach((g, i) => expect(Math.abs(g.valor - original[i].valor)).toBeLessThanOrEqual(0.01));
  });
});

describe("paraGuardado: baseReferencia", () => {
  it("grava a sobra de agora junto com os potes", () => {
    const lista = [montarSistema({ grupos: [] }, 840, false), pote("namoro", 120)];
    expect(paraGuardado({ grupos: [] }, lista, false, 1200).baseReferencia).toBe(1200);
  });

  it("sem base positiva (corte) mantém a referência anterior", () => {
    const lista = [montarSistema({ grupos: [] }, 0, false), pote("namoro", 120)];
    expect(paraGuardado({ grupos: [], baseReferencia: 1200 }, lista, false, 0).baseReferencia).toBe(1200);
    expect(paraGuardado({ grupos: [], baseReferencia: 1200 }, lista, false).baseReferencia).toBe(1200);
  });
});

/*
  Sem mínimo "Pra você": à mão a pessoa pode guardar 100% do que sobra. O
  "Guardar" da tela é o aporte do plano, que o motor limita só à sobra.
*/
describe("Guardar escolhido à mão: até 100%, sem mínimo pra você", () => {
  it("perfil do print: o 'Guardar' de R$ 1.323 vale R$ 1.323 e o Pra você fica em R$ 0", () => {
    const plano = gerarPlano(perfilDoPrint);
    expect(plano.resumo.excedente).toBe(1323);
    expect(plano.aporte).toBe(1323);
    const limites = limitesDoDivisor(plano, [montarSistema({ grupos: [] }, plano.aporte, false)]);
    expect(limites.livre).toBe(0);
    expect(limites.passou).toBe(false);
  });

  it("modo corte: zero", () => {
    const plano = gerarPlano({ ...perfilA, custoMoradia: 3000 });
    expect(plano.modoCorte).toBe(true);
    expect(plano.aporte).toBe(0);
  });
});

describe("'Ajustar proporcionalmente' de dado antigo que passa da sobra", () => {
  it("reparte a sobra inteira na proporção dos potes", () => {
    const plano = gerarPlano(perfilA);
    const base = plano.resumo.excedente;
    // dado antigo: Guardar do plano + um pote de 50% por cima
    const grupos = [montarSistema({ grupos: [] }, plano.aporte, false), pote("namoro", base * 0.5)];
    const antes = limitesDoDivisor(plano, grupos);
    expect(antes.passou).toBe(true);

    const ajustados = ajustarProporcionalmente(base, grupos);
    const depois = limitesDoDivisor(plano, ajustados);
    expect(depois.passou).toBe(false);
    expect(somaCentavos(ajustados)).toBe(Math.round(base * 100));
  });
});

describe("pote com valor novo", () => {
  it("itens que não cabem encolhem junto, sem passar do pote", () => {
    const p = pote("casa", 300, [
      { id: "a", nome: "Luz", valor: 200 },
      { id: "b", nome: "Água", valor: 100 },
    ]);
    const menor = poteComValor(p, 150);
    expect(menor.valor).toBe(150);
    expect(menor.itens.map((i) => i.valor)).toEqual([100, 50]);
  });

  it("itens que cabem ficam como estão", () => {
    const p = pote("casa", 300, [{ id: "a", nome: "Luz", valor: 100 }]);
    expect(poteComValor(p, 150).itens[0].valor).toBe(100);
  });

  it("o máximo de um item é o pote menos os outros itens", () => {
    const p = pote("casa", 300, [
      { id: "a", nome: "Luz", valor: 200 },
      { id: "b", nome: "Água", valor: 50 },
    ]);
    expect(maxDoItem(p, "b")).toBe(100);
  });
});

describe("trocar o ritmo com potes que não cabem", () => {
  it("os OUTROS potes encolhem pra caber na sobra; o Pra você fica em R$ 0", () => {
    const leve = gerarPlano({ ...perfilA, ritmo: "leve" });
    const acelerado = gerarPlano({ ...perfilA, ritmo: "acelerado" });
    const base = leve.resumo.excedente;
    // no leve sobra espaço: um pote ocupa tudo o que está no Pra você
    const livreNoLeve = limitesDoDivisor(leve, [montarSistema({ grupos: [] }, leve.aporte, false)]).livre;
    const grupos = [montarSistema({ grupos: [] }, leve.aporte, false), pote("namoro", livreNoLeve)];

    const outros = outrosPotesQueCabem(acelerado, grupos);
    expect(outros).not.toBeNull();
    const depois = [montarSistema({ grupos: [] }, acelerado.aporte, false), ...outros!];
    const limites = limitesDoDivisor(acelerado, depois);
    expect(limites.passou).toBe(false);
    expect(limites.livre).toBe(0);
    expect(outros![0].valor).toBe(arredondarReais(base - acelerado.aporte));
    expect(outros![0].valor).toBeLessThan(livreNoLeve);
    expect(base).toBe(acelerado.resumo.excedente);
  });

  it("quando cabem, nada muda", () => {
    const acelerado = gerarPlano({ ...perfilA, ritmo: "acelerado" });
    expect(outrosPotesQueCabem(acelerado, [montarSistema({ grupos: [] }, 500, false), pote("namoro", 0)])).toBeNull();
  });

  it("escolher o ritmo apaga a escolha à mão (chave ausente)", () => {
    const novo = perfilComRitmo({ ...perfilA, aporteEscolhido: 700 }, "leve");
    expect(novo.ritmo).toBe("leve");
    expect("aporteEscolhido" in novo).toBe(false);
  });
});

/*
  C8: os itens do "Guardar" nunca passam do pote quando ele encolhe fora do
  divisor (troca de ritmo, "Voltar pro Equilibrado", respostas refeitas).
*/
describe("itens do 'Guardar' quando o aporte encolhe", () => {
  const itens = [
    { id: "i1", nome: "Viagem", valor: 1500 },
    { id: "i2", nome: "CDB", valor: 500 },
  ];

  it("montarSistema mostra os itens encolhidos na proporção, sem mexer no valor", () => {
    const sistema = montarSistema({ grupos: [], itensDoSistema: itens }, 1000, false);
    expect(sistema.valor).toBe(1000);
    expect(sistema.itens.map((i) => i.valor)).toEqual([750, 250]);
    expect(restanteDoPote(sistema)).toBe(0);
  });

  it("montarSistema deixa os itens como estão quando cabem", () => {
    const sistema = montarSistema({ grupos: [], itensDoSistema: itens }, 2500, false);
    expect(sistema.itens).toEqual(itens);
  });

  it("trocar pra um ritmo que guarda menos encolhe os itens junto (e grava)", () => {
    const acelerado = gerarPlano({ ...perfilA, ritmo: "acelerado" });
    const leve = gerarPlano({ ...perfilA, ritmo: "leve" });
    expect(leve.aporte).toBeLessThan(acelerado.aporte);
    const sistema = montarSistema({ grupos: [], itensDoSistema: [{ id: "i1", nome: "Viagem", valor: acelerado.aporte }] }, acelerado.aporte, false);

    const mudanca = gruposComRitmo(leve, [sistema]);
    expect(mudanca).not.toBeNull();
    expect(mudanca!.outrosDiminuiram).toBe(false);
    const [guardar] = mudanca!.grupos;
    expect(guardar.itens[0].valor).toBe(leve.aporte);
    expect(itensPassamDe(guardar, leve.aporte)).toBe(false);
    // o que vai pro localStorage leva os itens encolhidos
    expect(paraGuardado({ grupos: [] }, mudanca!.grupos, false, leve.resumo.excedente).itensDoSistema).toEqual([
      { id: "i1", nome: "Viagem", valor: leve.aporte },
    ]);
  });

  it("itens que cabem no aporte novo e outros potes que cabem: nada muda", () => {
    const leve = gerarPlano({ ...perfilA, ritmo: "leve" });
    const sistema = montarSistema({ grupos: [], itensDoSistema: [{ id: "i1", nome: "CDB", valor: 10 }] }, 500, false);
    expect(gruposComRitmo(leve, [sistema, pote("namoro", 0)])).toBeNull();
  });

  it("outros potes que não cabem continuam encolhendo, com o aviso", () => {
    const leve = gerarPlano({ ...perfilA, ritmo: "leve" });
    const acelerado = gerarPlano({ ...perfilA, ritmo: "acelerado" });
    const livreNoLeve = limitesDoDivisor(leve, [montarSistema({ grupos: [] }, leve.aporte, false)]).livre;
    const mudanca = gruposComRitmo(acelerado, [montarSistema({ grupos: [] }, leve.aporte, false), pote("namoro", livreNoLeve)]);
    expect(mudanca?.outrosDiminuiram).toBe(true);
    expect(mudanca!.grupos[0].doSistema).toBe(true);
    expect(mudanca!.grupos).toHaveLength(2);
  });
});

/*
  C3: sobra com centavos (R$ 1.000,55). O motor guarda o aporte em reais
  inteiros; o que sobra abaixo de R$ 1 é resíduo e vale 0 na tela.
*/
describe("sobra com centavos", () => {
  const perfilCentavos: Perfil = {
    rendaMensal: 2000,
    tipoRenda: "clt",
    idade: 25,
    moradia: "pais",
    custoMoradia: 0,
    gastosFixos: [{ categoria: "mercado", valor: 999.45 }],
    dividas: [],
    guardado: 20000,
    meta: { tipo: "casa", valorAlvo: 33000 },
  };

  it("Guardar em 100%: o teto em reais inteiros é o próprio aporte, e o [+] trava", () => {
    const plano = gerarPlano({ ...perfilCentavos, aporteEscolhido: 1000.55 });
    expect(plano.resumo.excedente).toBe(1000.55);
    expect(plano.aporte).toBe(1000);
    const limites = limitesDoDivisor(plano, [montarSistema({ grupos: [] }, plano.aporte, false)]);
    expect(limites.livre).toBe(0.55);
    const livre = livreQueConta(limites.livre);
    expect(livre).toBe(0);
    const teto = tetoEmReais(plano.aporte + livre);
    // é isso que o divisor usa pro podeCrescer do "Guardar": teto == valor → [+] travado
    expect(teto).toBe(plano.aporte);
  });

  /*
    D12 (cartão) x C3 (divisor): com resíduo de centavos, os dois lados dão o
    MESMO R$, a MESMA % e o mesmo "nada livre". O divisor aqui é a conta que
    divisor.tsx faz (livreQueConta, tetoEmReais, pctDoGuardar, repartirEmReaisInteiros).
  */
  it.each([
    ["sobra de R$ 1.000,55", 2000, 1000.55],
    ["sobra pequena, de R$ 50,90", 1050.35, 50.9],
  ])("cartão e divisor dão o mesmo número (%s)", (_nome, renda, escolhido) => {
    const perfil: Perfil = { ...perfilCentavos, rendaMensal: renda, aporteEscolhido: escolhido };
    const plano = gerarPlano(perfil);
    const base = plano.resumo.excedente;
    expect(base).toBe(escolhido);
    const cartao = respostaDoPlano(plano, { simulacoes: simularRitmos(perfil), hoje: new Date(2026, 8, 24) });
    if (cartao.modo !== "plano") throw new Error("esperava o cartão do plano");

    const sistema = montarSistema({ grupos: [] }, plano.aporte, false);
    const livre = livreQueConta(limitesDoDivisor(plano, [sistema]).livre);
    const [reaisGuardar] = repartirEmReaisInteiros([sistema.valor], sistema.valor);
    const pctGuardar = pctDoGuardar(sistema.valor, base);
    const maxGuardar = pctDoGuardar(tetoEmReais(sistema.valor + livre), base);

    expect(livre).toBe(0);
    expect(cartao.livre).toBe(livre);
    expect(cartao.valorMes).toBe(reaisGuardar);
    expect(cartao.pct).toBe(100);
    expect(pctGuardar).toBe(cartao.pct);
    // o campo não trava abaixo do que a linha mostra
    expect(maxGuardar).toBe(pctGuardar);
    expect(cartao.fecho).toBe("Tudo o que sobra vai pros seus potes este mês.");
  });

  it("livreQueConta: menos de R$ 1 vale 0; R$ 1 ou mais fica como está", () => {
    expect(livreQueConta(0.55)).toBe(0);
    expect(livreQueConta(0.99)).toBe(0);
    expect(livreQueConta(1)).toBe(1);
    expect(livreQueConta(5.55)).toBe(5.55);
    expect(livreQueConta(Number.NaN)).toBe(0);
  });

  it("tetoEmReais arredonda pra baixo e aguenta o erro de ponto flutuante", () => {
    expect(tetoEmReais(1000.55)).toBe(1000);
    expect(tetoEmReais(0.1 + 0.2 + 419.7)).toBe(420);
    expect(tetoEmReais(419.99999999)).toBe(420);
    expect(tetoEmReais(-3)).toBe(0);
  });
});

/*
  C4: o pote novo nasce com 10% da sobra, sem passar do "Pra você"; o aviso
  "sem espaço" é só pra menos de R$ 1 livre.
*/
describe("pote novo", () => {
  it("com 4% livre nasce com os 4% (antes nascia em 0 dizendo que não havia espaço)", () => {
    const valor = valorDoPoteNovo(40, 1000);
    expect(valor).toBe(40);
  });

  it("com bastante livre nasce com 10% da sobra", () => {
    expect(valorDoPoteNovo(600, 1200)).toBe(120);
    expect(valorDoPoteNovo(150, 1000)).toBe(100);
  });

  it("com menos de R$ 1 livre nasce em 0", () => {
    expect(valorDoPoteNovo(0.55, 1000.55)).toBe(0);
    expect(valorDoPoteNovo(0, 1000)).toBe(0);
  });

  it("sem sobra (corte) nasce em 0", () => {
    expect(valorDoPoteNovo(100, 0)).toBe(0);
  });
});

/*
  C6/C7: o recado embaixo do "Rende x% ao mês".
*/
describe("recadoDoRendimento", () => {
  const comTaxa = (patch: Partial<Grupo> = {}): Grupo => ({ ...pote("viagem", 300), rendimentoMensal: 0.008, ...patch });
  const guardar = (patch: Partial<Grupo> = {}): Grupo => ({
    ...montarSistema({ grupos: [] }, 500, false),
    rendimentoMensal: 0.008,
    ...patch,
  });

  it("sem taxa não diz nada", () => {
    expect(recadoDoRendimento(pote("viagem", 300), "Casa", true)).toBeNull();
  });

  it("pote fora da meta: manda ligar 'Entra na meta'", () => {
    expect(recadoDoRendimento(comTaxa(), "Casa", true)).toContain("ligue “Entra na meta Casa”");
  });

  it("no máximo (5%) o recado de ligar a meta continua aparecendo", () => {
    expect(recadoDoRendimento(comTaxa({ rendimentoMensal: 0.05 }), "Casa", true)).toContain("Entra na meta Casa");
  });

  it("pote que já entra na meta: quem fala é o cartão", () => {
    expect(recadoDoRendimento(comTaxa({ contaParaMeta: true }), "Casa", true)).toBeNull();
  });

  it("sem meta: diz que entra quando escolher uma", () => {
    expect(recadoDoRendimento(comTaxa(), null, true)).toContain("quando você escolher uma meta");
  });

  it("'Guardar' antes do degrau de metas: nunca manda ligar a meta", () => {
    const recado = recadoDoRendimento(guardar({ contaParaMeta: false }), "Casa", false);
    expect(recado).not.toBeNull();
    expect(recado).not.toContain("ligue");
    expect(recado).toContain("quando o plano chegar nela");
    // mesmo com a caixinha ligada: antes do degrau 4 esse dinheiro ainda não é da meta
    expect(recadoDoRendimento(guardar({ contaParaMeta: true }), "Casa", false)).toBe(recado);
  });

  it("'Guardar' no degrau de metas volta à regra dos outros potes", () => {
    expect(recadoDoRendimento(guardar({ contaParaMeta: false }), "Casa", true)).toContain("ligue");
    expect(recadoDoRendimento(guardar({ contaParaMeta: true }), "Casa", true)).toBeNull();
  });

  it("o aviso do campo no teto fala os 5%", () => {
    expect(textosPote.maxRendimento).toBe("O máximo aqui é 5% ao mês.");
  });
});

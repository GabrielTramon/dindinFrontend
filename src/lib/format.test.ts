import { describe, expect, it } from "vitest";
import {
  arredondar,
  formatBRL,
  formatMeses,
  formatPct,
  lerReaisColados,
  lerReaisInteiros,
  mascaraCentavosBRL,
  mascaraInteiroBRL,
  mascaraTaxa,
  parseBRL,
  rascunhoReaisInteiros,
  taxaDoTexto,
  textoDaTaxa,
} from "./format";

describe("mascaraCentavosBRL", () => {
  it("os dígitos entram pela direita, como no app do banco", () => {
    expect(mascaraCentavosBRL("3")).toBe("0,03");
    expect(mascaraCentavosBRL("32")).toBe("0,32");
    expect(mascaraCentavosBRL("324")).toBe("3,24");
    expect(mascaraCentavosBRL("324780")).toBe("3.247,80");
  });

  it("o salário do contrato com centavos é digitável — era o que faltava", () => {
    expect(mascaraCentavosBRL("324780")).toBe("3.247,80");
    expect(parseBRL(mascaraCentavosBRL("324780"))).toBe(3247.8);
  });

  it("ignora o que não é dígito e zeros à esquerda", () => {
    expect(mascaraCentavosBRL("R$ 3.247,80")).toBe("3.247,80");
    expect(mascaraCentavosBRL("000324780")).toBe("3.247,80");
    expect(mascaraCentavosBRL("007")).toBe("0,07");
  });

  it("vazio continua vazio (o campo pode ficar em branco)", () => {
    expect(mascaraCentavosBRL("")).toBe("");
    expect(mascaraCentavosBRL("abc")).toBe("");
  });

  it("vai e volta pelo parseBRL sem perder centavo", () => {
    for (const valor of [0.01, 1.5, 19.99, 3247.8, 12000.05]) {
      const digitos = String(Math.round(valor * 100));
      expect(parseBRL(mascaraCentavosBRL(digitos))).toBe(valor);
    }
  });
});

describe("mascaraTaxa / taxaDoTexto / textoDaTaxa", () => {
  const MAX = 5; // % ao mês, o teto do domínio

  /** digita tecla por tecla, como uma pessoa digita */
  function digitar(teclas: string): { texto: string; fracao: number | null } {
    let texto = "";
    for (const tecla of teclas) texto = mascaraTaxa(texto + tecla, MAX);
    return { texto, fracao: taxaDoTexto(texto, MAX) };
  }

  it("digitar 0,8 dá 0,8% — o zero da frente NÃO some", () => {
    expect(digitar("0")).toEqual({ texto: "0", fracao: null });
    expect(digitar("0,")).toEqual({ texto: "0,", fracao: null });
    expect(digitar("0,8")).toEqual({ texto: "0,8", fracao: 0.008 });
  });

  it("um dígito sozinho é a unidade, não o décimo: 1 é 1% ao mês", () => {
    expect(digitar("1")).toEqual({ texto: "1", fracao: 0.01 });
    expect(digitar("2,5")).toEqual({ texto: "2,5", fracao: 0.025 });
    expect(digitar("1,25")).toEqual({ texto: "1,25", fracao: 0.0125 });
  });

  it("o campo para no teto em vez de guardar um número e mostrar outro", () => {
    expect(digitar("9")).toEqual({ texto: "5", fracao: 0.05 });
    expect(digitar("12")).toEqual({ texto: "5", fracao: 0.05 });
  });

  it("aceita ponto como vírgula e ignora letra, espaço e sinal", () => {
    expect(mascaraTaxa("0.8", MAX)).toBe("0,8");
    expect(mascaraTaxa("a0b,8c", MAX)).toBe("0,8");
    expect(mascaraTaxa("-0,8", MAX)).toBe("0,8");
  });

  it("no máximo duas casas e uma vírgula só", () => {
    expect(mascaraTaxa("0,8888", MAX)).toBe("0,88");
    expect(mascaraTaxa("0,8,9", MAX)).toBe("0,89");
  });

  it("vazio e rascunho não viram taxa", () => {
    for (const texto of ["", " ", ",", "0", "0,", "0,0"]) {
      expect(taxaDoTexto(texto, MAX)).toBe(null);
    }
  });

  it("vai e volta: o texto do valor guardado é o que a pessoa digitou", () => {
    for (const digitado of ["0,8", "1", "1,25", "5"]) {
      const fracao = taxaDoTexto(digitado, MAX);
      expect(fracao).not.toBe(null);
      expect(textoDaTaxa(fracao!)).toBe(digitado);
    }
    expect(textoDaTaxa(undefined)).toBe("");
  });

  /*
    A regressão que motivou estes testes: a primeira versão do campo apagava os
    DÍGITOS e mantinha a vírgula (um `\d` que virou `d` na edição), então digitar
    "0,8" deixava o campo em "," e nada era guardado. Quem digitou reclamou.
  */
  it("nenhum dígito é apagado pela máscara", () => {
    for (const tecla of "0123456789") {
      expect(mascaraTaxa(tecla, MAX)).toBe(Number(tecla) > MAX ? String(MAX) : tecla);
    }
  });
});

describe("o que já existia continua igual", () => {
  it("máscara de inteiro", () => {
    expect(mascaraInteiroBRL("3247")).toBe("3.247");
    expect(mascaraInteiroBRL("")).toBe("");
  });

  // o Intl separa "R$" do número com espaço não separável (U+00A0)
  const semNbsp = (s: string) => s.replace(new RegExp(String.fromCharCode(160), "g"), " ");

  it("formatBRL, formatPct e formatMeses", () => {
    expect(semNbsp(formatBRL(1234.56))).toBe("R$ 1.235");
    expect(semNbsp(formatBRL(1234.56, { centavos: true }))).toBe("R$ 1.234,56");
    expect(formatPct(0.4321)).toBe("43%");
    expect(formatMeses(14)).toBe("1 ano e 2 meses");
  });

  it("arredondar não erra em valor com centavo quebrado", () => {
    expect(arredondar(19.99)).toBe(19.99);
    expect(arredondar(4973.390000000001)).toBe(4973.39);
  });
});

/*
  A regressão por trás destes: a máscara dos campos de dinheiro apagava tudo que
  não era dígito, então a vírgula sumia e os centavos entravam como reais —
  "2.500,50" virava R$ 250.050 e passava na validação. No campo de centavos era
  o contrário: colar "3500" dava R$ 35,00.
*/
describe("lerReaisColados", () => {
  it("lê os formatos que chegam colando", () => {
    expect(lerReaisColados("2.500,50")).toBe(2500.5);
    expect(lerReaisColados("2500,5")).toBe(2500.5);
    expect(lerReaisColados("R$ 2.500,00")).toBe(2500);
    expect(lerReaisColados("2,500.00")).toBe(2500);
    expect(lerReaisColados("3247.8")).toBe(3247.8);
    expect(lerReaisColados("3500")).toBe(3500);
    expect(lerReaisColados("1.234.567,89")).toBe(1234567.89);
  });

  it("separador seguido de 3 dígitos é milhar, em qualquer convenção", () => {
    expect(lerReaisColados("2.500")).toBe(2500);
    expect(lerReaisColados("2,500")).toBe(2500);
    expect(lerReaisColados("1,234,567")).toBe(1234567);
  });

  it("sem dígito é vazio", () => {
    expect(lerReaisColados("")).toBeUndefined();
    expect(lerReaisColados("R$")).toBeUndefined();
    expect(lerReaisColados(",")).toBeUndefined();
    expect(lerReaisColados(",5")).toBe(0.5);
  });
});

describe("lerReaisInteiros (digitando no campo sem centavos)", () => {
  it("dígitos com a máscara de milhar continuam como sempre", () => {
    expect(lerReaisInteiros("2")).toBe(2);
    expect(lerReaisInteiros("2.500")).toBe(2500);
    expect(lerReaisInteiros("1.2345")).toBe(12345);
    expect(lerReaisInteiros("")).toBeUndefined();
  });

  it("vírgula digitada: os centavos arredondam, nunca viram reais", () => {
    expect(lerReaisInteiros("2.500,")).toBe(2500);
    expect(lerReaisInteiros("2.500,4")).toBe(2500);
    expect(lerReaisInteiros("2.500,5")).toBe(2501);
    expect(lerReaisInteiros("2.500,50")).toBe(2501);
    // o terceiro dígito depois da vírgula é ignorado
    expect(lerReaisInteiros("2.500,499")).toBe(2500);
  });

  it("limita a parte inteira", () => {
    expect(lerReaisInteiros("1234567890", 9)).toBe(123456789);
  });

  it("o rascunho na tela é lido igual ao texto digitado", () => {
    for (const texto of ["2.500,", "2500,5", "2.500,50", "2.500,507", ",5", "1.2345,1"]) {
      const rascunho = rascunhoReaisInteiros(texto);
      expect(rascunho).not.toBeNull();
      expect(lerReaisInteiros(rascunho ?? "")).toBe(lerReaisInteiros(texto));
    }
    expect(rascunhoReaisInteiros("2500,5")).toBe("2.500,5");
    expect(rascunhoReaisInteiros("2.500,507")).toBe("2.500,50");
    expect(rascunhoReaisInteiros("2.500")).toBeNull();
  });
});

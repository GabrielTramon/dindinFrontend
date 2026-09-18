import { describe, expect, it } from "vitest";
import {
  arredondar,
  formatBRL,
  formatMeses,
  formatPct,
  mascaraCentavosBRL,
  mascaraInteiroBRL,
  mascaraTaxa,
  parseBRL,
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

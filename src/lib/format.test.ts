import { describe, expect, it } from "vitest";
import { arredondar, formatBRL, formatMeses, formatPct, mascaraCentavosBRL, mascaraInteiroBRL, parseBRL } from "./format";

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

describe("o que já existia continua igual", () => {
  it("máscara de inteiro", () => {
    expect(mascaraInteiroBRL("3247")).toBe("3.247");
    expect(mascaraInteiroBRL("")).toBe("");
  });

  // o Intl separa "R$" do número com espaço não separável (U+00A0)
  const semNbsp = (s: string) => s.replace(/ /g, " ");

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

import { describe, expect, it } from "vitest";
import { marcasDoEixo } from "./eixo";

describe("marcasDoEixo", () => {
  it("números redondos do zero até cobrir o máximo", () => {
    expect(marcasDoEixo(2395.08)).toEqual([0, 1000, 2000, 3000]);
    expect(marcasDoEixo(100109)).toEqual([0, 50000, 100000, 150000]);
    expect(marcasDoEixo(120000)).toEqual([0, 50000, 100000, 150000]);
    expect(marcasDoEixo(9000)).toEqual([0, 2500, 5000, 7500, 10000]);
  });

  it("um máximo que já é redondo vira o topo, sem marca sobrando", () => {
    expect(marcasDoEixo(100000)).toEqual([0, 25000, 50000, 75000, 100000]);
  });

  it("sem valor (ou valor estranho), só o zero", () => {
    expect(marcasDoEixo(0)).toEqual([0]);
    expect(marcasDoEixo(-5)).toEqual([0]);
    expect(marcasDoEixo(Number.NaN)).toEqual([0]);
  });

  it("a última marca sempre cobre o máximo, em qualquer escala", () => {
    for (const maximo of [1, 7, 99, 1234, 98765, 4_321_000, 3.7e9]) {
      const marcas = marcasDoEixo(maximo);
      expect(marcas.at(-1)!).toBeGreaterThanOrEqual(maximo);
      expect(marcas.length).toBeGreaterThanOrEqual(2);
      expect(marcas.length).toBeLessThanOrEqual(6);
    }
  });
});

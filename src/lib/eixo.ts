import { arredondar } from "./format";

/*
  As marcas do eixo de um gráfico: números redondos (1, 2, 2,5 ou 5 vezes uma
  potência de 10), do zero até o primeiro redondo que cobre o maior valor. O
  topo do gráfico é a última marca — a coluna mais alta nunca encosta no teto
  por acaso, e as linhas de grade caem em valores que dá pra ler.
*/

/** [0, 50.000, 100.000, 150.000] pra um máximo de 120.000, com umas `alvo` divisões. */
export function marcasDoEixo(maximo: number, alvo = 4): number[] {
  if (!Number.isFinite(maximo) || maximo <= 0) return [0];
  const bruto = maximo / Math.max(1, alvo);
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? 10 * potencia;
  const divisoes = Math.ceil(arredondar(maximo / passo, 6));
  return Array.from({ length: divisoes + 1 }, (_, i) => arredondar(i * passo, 2));
}

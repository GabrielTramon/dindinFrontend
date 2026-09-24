import { LIVRE_MINIMO, MAX_RENDIMENTO_MENSAL, textosPote, valorDePct, type Grupo, type ItemGrupo } from "@/domain";
import { arredondar } from "@/lib/format";

/*
  O que o divisor, as linhas de pote e os dois drawers compartilham: ids de
  foco, cores, nomes visíveis e as regras de item e rendimento que vieram do
  antigo editor de grupos (grupos-editor.tsx) sem mudar de comportamento.
*/

export const idPote = (id: string) => `pote-${id}`;
export const idPctPote = (id: string) => `pote-${id}-pct`;
export const idMaisPote = (id: string) => `pote-${id}-mais`;
export const idOpcoesPote = (id: string) => `pote-${id}-opcoes`;
export const idNomePote = (id: string) => `pote-${id}-nome`;
export const idRendimentoPote = (id: string) => `pote-${id}-rendimento`;
export const idEditarRendimento = (id: string) => `pote-${id}-editar-rendimento`;
export const idAdicionarItem = (id: string) => `pote-${id}-adicionar-item`;
export const idNomeItem = (id: string) => `item-${id}-nome`;
export const idValorItem = (id: string) => `item-${id}-valor`;
export const ID_NOVO_POTE = "pote-novo";

/*
  Cores decorativas (o texto sempre diz o nome e a %): o "Guardar" tem a cor do
  plano; os potes da pessoa alternam dois tons pra vizinhos nunca repetirem; o
  "Pra você" é o tom do livre. O vermelho (chart-5) fica de fora: aqui ele
  significaria erro, e dividir não é erro.
*/
export const COR_GUARDAR = "bg-primary";
export const COR_PRA_VOCE = "bg-chart-3";
const CORES_POTE = ["bg-chart-2", "bg-chart-4"] as const;

/** a cor do pote na posição `indice` da lista inteira (o "Guardar" é o 0) */
export function corDoPote(grupo: Grupo, indice: number): string {
  if (grupo.doSistema) return COR_GUARDAR;
  return CORES_POTE[Math.max(0, indice - 1) % CORES_POTE.length];
}

/** o nome que aparece enquanto a pessoa ainda não nomeou o pote */
export function nomeDoPote(grupo: Pick<Grupo, "nome">, padrao = "Pote sem nome"): string {
  return grupo.nome.trim() || padrao;
}

export function novoId(): string {
  // o id vem do cliente e é o mesmo que viaja pro servidor: único por pessoa
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const somar = (itens: ItemGrupo[]) => arredondar(itens.reduce((acc, i) => acc + (Number.isFinite(i.valor) ? i.valor : 0), 0));

/** true quando os itens de dentro do pote somam mais que `valor` (comparado em centavos) */
export function itensPassamDe(grupo: Grupo, valor: number): boolean {
  return Math.round(somar(grupo.itens) * 100) > Math.round(arredondar(Math.max(0, valor)) * 100);
}

/** o que ainda não tem nome dentro do pote: valor − itens, nunca negativo */
export function restanteDoPote(grupo: Grupo): number {
  return arredondar(Math.max(0, grupo.valor - somar(grupo.itens)));
}

/** o máximo que um item pode ter: o pote menos os outros itens */
export function maxDoItem(grupo: Grupo, itemId: string): number {
  return arredondar(Math.max(0, grupo.valor - somar(grupo.itens.filter((i) => i.id !== itemId))));
}

/**
 * O pote com um valor novo. Se os itens passam do valor novo, eles encolhem na
 * proporção (maior resto em centavos): a soma dos itens nunca passa do pote.
 */
export function poteComValor(grupo: Grupo, valor: number): Grupo {
  const novo = arredondar(Math.max(0, valor));
  const soma = somar(grupo.itens);
  if (soma <= novo || soma <= 0) return { ...grupo, valor: novo };
  const pesos = grupo.itens.map((i) => Math.max(0, Math.round(arredondar(i.valor) * 100)));
  const totalPesos = pesos.reduce((a, b) => a + b, 0);
  const alvo = Math.round(novo * 100);
  const exatos = pesos.map((p) => (p * alvo) / totalPesos);
  const partes = exatos.map((e) => Math.floor(e));
  let faltam = alvo - partes.reduce((a, b) => a + b, 0);
  const ordem = exatos
    .map((e, i) => ({ i, resto: e - Math.floor(e) }))
    .sort((a, b) => b.resto - a.resto || a.i - b.i);
  for (const { i } of ordem) {
    if (faltam <= 0) break;
    partes[i] += 1;
    faltam -= 1;
  }
  return {
    ...grupo,
    valor: novo,
    itens: grupo.itens.map((item, i) => ({ ...item, valor: arredondar(partes[i] / 100) })),
  };
}

/*
  Centavos na sobra (CLT com bruto: sobra R$ 1.000,55). O motor guarda o aporte
  em reais inteiros (arredonda pra baixo), então com o "Guardar" em 100% ficam
  R$ 0,55 "livres" que nenhum [+] consegue dar pra ele. Sem tratar, o [+] nunca
  travava e o "Pra você" dizia "0% · R$ 1/mês · livre pro dia a dia".
*/

/**
 * o que está no "Pra você" como a tela conta: menos de R$ 1 é resíduo de centavos, vale 0.
 * O limite é o LIVRE_MINIMO do domínio, o mesmo do cartão do topo: os dois dão o mesmo número.
 */
export function livreQueConta(livre: number): number {
  return Number.isFinite(livre) && livre >= LIVRE_MINIMO ? arredondar(livre) : 0;
}

/** o teto do "Guardar" em reais inteiros, pra baixo — o mesmo arredondamento do aporte no motor */
export function tetoEmReais(teto: number): number {
  // a folga cobre o erro de ponto flutuante: 419,99999999 é 420, não 419
  return Number.isFinite(teto) ? Math.max(0, Math.floor(teto + 1e-6)) : 0;
}

/**
 * O R$ com que um pote novo nasce: 10% da sobra, sem passar do que está no
 * "Pra você". Com menos de R$ 1 livre, nasce em 0 (e a gaveta avisa).
 */
export function valorDoPoteNovo(livre: number, base: number): number {
  if (!(base > 0)) return 0;
  const cabe = livreQueConta(livre);
  return cabe > 0 ? Math.min(valorDePct(10, base), cabe) : 0;
}

/** rendimento é guardado como fração (0,8% = 0.008) e digitado como % */
export const MAX_PCT_RENDIMENTO = MAX_RENDIMENTO_MENSAL * 100;

/*
  O rendimento só muda um número na tela: o prazo da meta. Um pote que não
  entra na meta pode render 5% ao mês que nada se mexe, e quem digitou a taxa
  fica achando que a conta está quebrada. Então a linha embaixo do selo diz
  onde aquele número vai cair. As frases moram em `textosPote` (domínio).

  `degrauDeMetas` é `plano.degrau === 4`: antes disso o dinheiro do "Guardar"
  ainda vai pro fôlego, pra dívida ou pra reserva, e mandar ligar "Entra na
  meta" nele seria mandar contar duas vezes o mesmo dinheiro.
*/
/**
 * O recado embaixo do "Rende x% ao mês". null = nada a dizer: o pote não rende,
 * ou a taxa já mexe no prazo (aí quem fala é o cartão do topo).
 */
export function recadoDoRendimento(grupo: Grupo, nomeMeta: string | null, degrauDeMetas: boolean): string | null {
  if (!((grupo.rendimentoMensal ?? 0) > 0)) return null;
  if (nomeMeta === null) return textosPote.rendimentoSemMeta;
  if (grupo.doSistema && !degrauDeMetas) return textosPote.guardarAntesDaMeta(nomeMeta);
  if (!grupo.contaParaMeta) return textosPote.ligarEntraNaMeta(nomeMeta);
  return null;
}

import {
  beneficioSchema,
  categoriaPorSlug,
  dividaSchema,
  gastoFixoSchema,
  metaSchema,
  nomeDoBeneficio,
  perfilSchema,
  SLUG_OUTRO,
  type PerfilInput,
} from "@/domain";
import { moradiaSemCusto, type BeneficioRascunho, type GastoRascunho, type Respostas } from "./respostas";

/*
  As 9 perguntas, na ordem. Cada passo sabe se está respondido (`valido`),
  o que dizer quando a resposta existe mas não serve (`erro`) e se deve ser
  pulado (`pular`). A validade usa o mesmo schema do perfil final, então o que
  passa aqui passa em `validarPerfil` no fim.

  Nas listas (gastos e dívidas) são duas coisas diferentes:
  - `erro`: algo digitado que não serve (valor 0, gasto com valor e sem nome).
    Cita a linha, e `campoDoErro` aponta o campo pra ele receber aria-invalid.
  - `falta`: a linha ainda está pela metade. Não é erro, mas o Continuar fica
    travado por causa dela, e a tela precisa dizer o quê.
*/

export type PassoId = keyof PerfilInput;

/** texto fixo, ou que muda com o que já foi respondido */
type Texto = string | ((r: Respostas) => string);

/** caminho do campo dentro da resposta do passo: [1, "valor"] = o valor do 2º gasto; ["nome"] = o nome da meta */
export type CaminhoDoCampo = readonly PropertyKey[];

export interface Passo {
  id: PassoId;
  pergunta: Texto;
  ajuda?: Texto;
  /** o passo está respondido e a resposta passa no schema */
  valido: (r: Respostas) => boolean;
  /** mensagem quando há resposta mas ela não passa (ex.: valor alto demais) */
  erro?: (r: Respostas) => string | undefined;
  /** em que campo está o problema que `erro` descreve */
  campoDoErro?: (r: Respostas) => CaminhoDoCampo | undefined;
  /** o que ainda falta pra liberar o Continuar, quando nada está errado, só incompleto */
  falta?: (r: Respostas) => string | undefined;
  /** o passo não se aplica a essas respostas */
  pular?: (r: Respostas) => boolean;
}

export interface Problema {
  mensagem: string;
  caminho: CaminhoDoCampo;
}

/** o campo com erro numa lista (gastos, dívidas): a linha e o nome do campo nela */
export interface ErroNaLinha {
  indice: number;
  campo: string;
}

/** [1, "valor"] → { indice: 1, campo: "valor" }; caminho que não aponta pra uma linha → undefined */
export function erroNaLinha(caminho: CaminhoDoCampo | undefined): ErroNaLinha | undefined {
  const [indice, campo] = caminho ?? [];
  return typeof indice === "number" ? { indice, campo: String(campo ?? "") } : undefined;
}

function campo(id: PassoId): Pick<Passo, "valido" | "erro"> {
  const schema = perfilSchema.shape[id];
  return {
    valido: (r) => schema.safeParse(r[id]).success,
    erro: (r) => {
      if (r[id] === undefined) return undefined;
      const resultado = schema.safeParse(r[id]);
      return resultado.success ? undefined : resultado.error.issues.at(0)?.message;
    },
  };
}

/** "O valor precisa…" → "o valor precisa…", pra vir depois do nome da linha */
function minuscula(texto: string): string {
  return texto.charAt(0).toLocaleLowerCase("pt-BR") + texto.slice(1);
}

function rotuloDoGasto(g: GastoRascunho): string {
  if (g.categoria === SLUG_OUTRO) return g.nome?.trim() || "Outro gasto";
  return categoriaPorSlug(g.categoria)?.nome ?? "Gasto";
}

/*
  O que não é erro numa linha: campo que ainda não foi preenchido. Gasto sem
  valor (e o nome do "outro" antes do valor) e dívida sem saldo (e o tipo antes
  do saldo) são preenchimento em andamento, e isso vai pra `falta`. O resto
  (valor 0, alto demais, gasto com valor e sem nome, dívida com saldo e sem
  tipo) é erro, e aparece mesmo que outra linha ainda esteja pela metade.
*/

function problemaDosGastos(r: Respostas): Problema | undefined {
  const lista = r.gastosFixos;
  if (lista === undefined) return undefined;
  for (const [i, g] of lista.entries()) {
    if (g.valor === undefined) continue;
    const issue = gastoFixoSchema.safeParse(g).error?.issues.at(0);
    if (issue) return { mensagem: `${rotuloDoGasto(g)}: ${minuscula(issue.message)}`, caminho: [i, ...issue.path] };
  }
  // a lista como um todo (ex.: acima do máximo), só com as linhas completas
  if (lista.some((g) => g.valor === undefined)) return undefined;
  const issue = perfilSchema.shape.gastosFixos.safeParse(lista).error?.issues.at(0);
  return issue && { mensagem: issue.message, caminho: issue.path };
}

function faltaNosGastos(r: Respostas): string | undefined {
  const g = r.gastosFixos?.find((x) => x.valor === undefined);
  if (g === undefined) return undefined;
  if (g.categoria === SLUG_OUTRO && !g.nome?.trim()) return "Falta o nome e o valor do outro gasto.";
  return `Falta dizer quanto sai em ${rotuloDoGasto(g)}.`;
}

function problemaDasDividas(r: Respostas): Problema | undefined {
  const lista = r.dividas;
  if (lista === undefined) return undefined;
  for (const [i, d] of lista.entries()) {
    const issue = dividaSchema
      .safeParse(d)
      .error?.issues.find((x) => !(d.saldo === undefined && (x.path[0] === "saldo" || x.path[0] === "tipo")));
    if (issue) {
      const numero = i + 1;
      const mensagem =
        issue.path[0] === "tipo" ? `Escolha o tipo da dívida ${numero}` : `Dívida ${numero}: ${minuscula(issue.message)}`;
      return { mensagem, caminho: [i, ...issue.path] };
    }
  }
  if (lista.some((d) => d.saldo === undefined)) return undefined;
  const issue = perfilSchema.shape.dividas.safeParse(lista).error?.issues.at(0);
  return issue && { mensagem: issue.message, caminho: issue.path };
}

function faltaNasDividas(r: Respostas): string | undefined {
  const lista = r.dividas ?? [];
  const i = lista.findIndex((d) => d.saldo === undefined);
  if (i < 0) return undefined;
  const numero = i + 1;
  return lista[i].tipo === undefined
    ? `Falta escolher o tipo e dizer quanto você deve na dívida ${numero}.`
    : `Falta dizer quanto você deve na dívida ${numero}.`;
}

function rotuloDoBeneficio(b: BeneficioRascunho): string {
  return b.tipo === "outro" && !b.nome?.trim() ? "Outro benefício" : nomeDoBeneficio(b);
}

/*
  Os vales moram na pergunta 1, embaixo do salário, e são opcionais: a pergunta
  só trava por causa deles quando uma linha está pela metade ou errada. As
  mensagens aparecem no bloco dos vales (renda-controle), não embaixo do
  salário — o campo do salário não tem culpa.
*/

/** Um vale digitado que não serve (valor 0, "outro" com valor e sem nome). */
export function problemaDosBeneficios(r: Respostas): Problema | undefined {
  const lista = r.beneficios;
  if (lista === undefined) return undefined;
  for (const [i, b] of lista.entries()) {
    if (b.valor === undefined) continue;
    const issue = beneficioSchema.safeParse(b).error?.issues.at(0);
    if (issue) return { mensagem: `${rotuloDoBeneficio(b)}: ${minuscula(issue.message)}`, caminho: [i, ...issue.path] };
  }
  if (lista.some((b) => b.valor === undefined)) return undefined;
  const issue = perfilSchema.shape.beneficios.safeParse(lista).error?.issues.at(0);
  return issue && { mensagem: issue.message, caminho: issue.path };
}

/** A linha de vale ainda sem valor: não é erro, mas o Continuar espera. */
export function faltaNosBeneficios(r: Respostas): string | undefined {
  const b = r.beneficios?.find((x) => x.valor === undefined);
  if (b === undefined) return undefined;
  if (b.tipo === "outro" && !b.nome?.trim()) return "Falta o nome e o valor do outro benefício.";
  return `Falta dizer quanto vem de ${rotuloDoBeneficio(b)}.`;
}

const beneficiosProntos = (r: Respostas) => problemaDosBeneficios(r) === undefined && faltaNosBeneficios(r) === undefined;

/**
 * CLT e PJ respondem se o 13º entra no plano; informal não é perguntado.
 * `decimoTerceiro` undefined = ainda não respondeu.
 */
export function faltaODecimo(r: Respostas): boolean {
  return (r.tipoRenda === "clt" || r.tipoRenda === "pj") && r.decimoTerceiro === undefined;
}

/**
 * Quem tem algo guardado responde se isso entra na meta: `guardados`
 * undefined é "não respondeu" ([] é "não"). Sem nada guardado, não há pergunta.
 */
export function faltaOGuardadoNaMeta(r: Respostas): boolean {
  return (r.guardado ?? 0) > 0 && r.meta?.valorAlvo !== undefined && r.meta.guardados === undefined;
}

function problemaDaMeta(r: Respostas): Problema | undefined {
  // sem valor ainda é preenchimento em andamento: o Continuar só não libera
  if (r.meta === undefined || r.meta.valorAlvo === undefined) return undefined;
  const issue = metaSchema.safeParse(r.meta).error?.issues.at(0);
  return issue && { mensagem: issue.message, caminho: issue.path };
}

const renda = campo("rendaMensal");
const tipoRenda = campo("tipoRenda");
const salarioBruto = campo("salarioBruto");
const idade = campo("idade");
const gastosFixos = campo("gastosFixos");
const dividas = campo("dividas");

export const PASSOS: readonly Passo[] = [
  {
    id: "rendaMensal",
    // o enunciado acompanha o segmentado da tela: quem escolheu "salário bruto"
    // não pode continuar lendo "líquido, depois dos descontos"
    pergunta: (r) => (r.rendaInformada === "bruta" ? "Qual é o seu salário bruto?" : "Quanto entra na sua conta por mês?"),
    // PJ não tem conta de CLT pra fazer (holeriteDasRespostas): a ajuda não pode prometer o líquido
    ajuda: (r) =>
      r.rendaInformada !== "bruta"
        ? "Líquido, depois dos descontos. Se varia, uma média dos últimos 3 meses."
        : r.tipoRenda === "pj"
          ? "O valor das suas notas no mês, antes do imposto."
          : "O valor do contrato, antes dos descontos. O dindin calcula o que cai na conta.",
    // no modo bruto quem tem limite próprio é o bruto digitado: R$ 1,2 mi de bruto dá menos de R$ 1 mi
    // de líquido, passaria aqui e só cairia no fim, em validarPerfil
    valido: (r) =>
      renda.valido(r) && (r.rendaInformada !== "bruta" || salarioBruto.valido(r)) && beneficiosProntos(r),
    erro: (r) => (r.rendaInformada === "bruta" ? salarioBruto.erro?.(r) : undefined) ?? renda.erro?.(r),
  },
  {
    id: "tipoRenda",
    pergunta: "Esse valor é fixo ou varia?",
    ...tipoRenda,
    valido: (r) => tipoRenda.valido(r) && !faltaODecimo(r),
    falta: (r) => (faltaODecimo(r) ? "Falta dizer se o 13º entra no plano." : undefined),
  },
  {
    id: "idade",
    pergunta: "Quantos anos você tem?",
    ...idade,
    // um dígito só (o "2" de "24") é preenchimento em andamento, não erro; 0 não começa idade nenhuma
    erro: (r) => (r.idade !== undefined && r.idade > 0 && r.idade < 10 ? undefined : idade.erro?.(r)),
  },
  {
    id: "moradia",
    pergunta: "Onde você mora hoje?",
    ...campo("moradia"),
  },
  {
    id: "custoMoradia",
    pergunta: "Quanto sai de moradia por mês?",
    ajuda: "Aluguel ou parcela, mais condomínio. Só a sua parte, se divide.",
    ...campo("custoMoradia"),
    pular: (r) => moradiaSemCusto(r.moradia),
  },
  {
    id: "gastosFixos",
    pergunta: "Fora moradia, o que sai todo mês?",
    ajuda: "Escolha o que você tem e diga quanto sai em cada um. Chute os valores — dá pra ajustar depois.",
    valido: gastosFixos.valido,
    erro: (r) => problemaDosGastos(r)?.mensagem,
    campoDoErro: (r) => problemaDosGastos(r)?.caminho,
    falta: faltaNosGastos,
  },
  {
    id: "dividas",
    pergunta: "Você deve alguma coisa?",
    valido: dividas.valido,
    erro: (r) => problemaDasDividas(r)?.mensagem,
    campoDoErro: (r) => problemaDasDividas(r)?.caminho,
    falta: faltaNasDividas,
  },
  {
    id: "guardado",
    pergunta: "Quanto você tem guardado hoje?",
    ajuda: "Poupança, conta rendendo, dinheiro parado. Se for nada, tudo bem — é daí que a gente parte.",
    ...campo("guardado"),
  },
  {
    id: "meta",
    pergunta: "Qual é a sua meta agora?",
    ajuda: "Uma só, a que mais importa. Dá pra mudar depois.",
    // `campo("meta")` não serve: o campo é opcional no schema, e schema.safeParse(undefined)
    // passa — o passo ficaria "respondido" vazio e daria pra pular a pergunta inteira.
    valido: (r) => r.meta !== undefined && metaSchema.safeParse(r.meta).success && !faltaOGuardadoNaMeta(r),
    erro: (r) => problemaDaMeta(r)?.mensagem,
    campoDoErro: (r) => problemaDaMeta(r)?.caminho,
    falta: (r) =>
      faltaOGuardadoNaMeta(r) ? "Falta dizer se o que você já tem guardado entra nessa meta." : undefined,
  },
];

/** Resolve o texto de um passo pras respostas atuais. */
export function textoDoPasso(texto: Texto | undefined, r: Respostas): string | undefined {
  return typeof texto === "function" ? texto(r) : texto;
}

/** Índices dos passos que se aplicam a essas respostas, em ordem. */
export function passosVisiveis(r: Respostas): number[] {
  return PASSOS.flatMap((p, i) => (p.pular?.(r) ? [] : [i]));
}

export function passoAnterior(i: number, r: Respostas): number | null {
  const antes = passosVisiveis(r).filter((j) => j < i);
  return antes.length > 0 ? antes[antes.length - 1] : null;
}

export function proximoPasso(i: number, r: Respostas): number | null {
  return passosVisiveis(r).find((j) => j > i) ?? null;
}

/**
 * Onde a pessoa pode estar de verdade, dado o passo que a URL pede:
 * volta pro primeiro passo sem resposta válida, pula passo que não se aplica
 * e trata número inválido como o começo.
 */
export function passoPermitido(pedido: number, r: Respostas): number {
  const visiveis = passosVisiveis(r);
  const alvo = Number.isInteger(pedido) && pedido >= 0 && pedido < PASSOS.length ? pedido : 0;
  for (const i of visiveis) {
    if (i >= alvo) break;
    if (!PASSOS[i].valido(r)) return i;
  }
  if (visiveis.includes(alvo)) return alvo;
  return visiveis.find((i) => i > alvo) ?? visiveis[visiveis.length - 1];
}

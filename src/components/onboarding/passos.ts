import { metaSchema, perfilSchema, SLUG_OUTRO, type PerfilInput } from "@/domain";
import { moradiaSemCusto, type Respostas } from "./respostas";

/*
  As 9 perguntas, na ordem. Cada passo sabe se está respondido (`valido`),
  o que dizer quando a resposta existe mas não serve (`erro`) e se deve ser
  pulado (`pular`). A validade usa o mesmo schema do perfil final, então o que
  passa aqui passa em `validarPerfil` no fim.
*/

export type PassoId = keyof PerfilInput;

/** texto fixo, ou que muda com o que já foi respondido */
type Texto = string | ((r: Respostas) => string);

export interface Passo {
  id: PassoId;
  pergunta: Texto;
  ajuda?: Texto;
  /** o passo está respondido e a resposta passa no schema */
  valido: (r: Respostas) => boolean;
  /** mensagem quando há resposta mas ela não passa (ex.: valor alto demais) */
  erro?: (r: Respostas) => string | undefined;
  /** o passo não se aplica a essas respostas */
  pular?: (r: Respostas) => boolean;
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

const idade = campo("idade");
const dividas = campo("dividas");
const gastosFixos = campo("gastosFixos");

export const PASSOS: readonly Passo[] = [
  {
    id: "rendaMensal",
    // o enunciado acompanha o segmentado da tela: quem escolheu "salário bruto"
    // não pode continuar lendo "líquido, depois dos descontos"
    pergunta: (r) => (r.rendaInformada === "bruta" ? "Qual é o seu salário bruto?" : "Quanto entra na sua conta por mês?"),
    ajuda: (r) =>
      r.rendaInformada === "bruta"
        ? "O valor do contrato, antes dos descontos. O dindin calcula o que cai na conta."
        : "Líquido, depois dos descontos. Se varia, uma média dos últimos 3 meses.",
    ...campo("rendaMensal"),
  },
  {
    id: "tipoRenda",
    pergunta: "Esse valor é fixo ou varia?",
    ...campo("tipoRenda"),
  },
  {
    id: "idade",
    pergunta: "Quantos anos você tem?",
    ...idade,
    // um dígito só (o "2" de "24") é preenchimento em andamento, não erro
    erro: (r) => (r.idade !== undefined && r.idade < 10 ? undefined : idade.erro?.(r)),
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
    // uma linha pela metade é preenchimento em andamento, não erro: só fala quando todas estão completas
    erro: (r) =>
      r.gastosFixos !== undefined &&
      r.gastosFixos.length > 0 &&
      r.gastosFixos.every(
        (g) => g.valor !== undefined && (g.categoria !== SLUG_OUTRO || (g.nome?.trim() ?? "") !== ""),
      )
        ? gastosFixos.erro?.(r)
        : undefined,
  },
  {
    id: "dividas",
    pergunta: "Você deve alguma coisa?",
    valido: dividas.valido,
    // uma dívida pela metade não é erro, é preenchimento em andamento: só fala quando todas têm tipo e saldo
    erro: (r) =>
      r.dividas !== undefined &&
      r.dividas.length > 0 &&
      r.dividas.every((d) => d.tipo !== undefined && d.saldo !== undefined)
        ? dividas.erro?.(r)
        : undefined,
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
    valido: (r) => r.meta !== undefined && metaSchema.safeParse(r.meta).success,
    erro: (r) => {
      if (r.meta === undefined || r.meta.valorAlvo === undefined) return undefined;
      const resultado = metaSchema.safeParse(r.meta);
      return resultado.success ? undefined : resultado.error.issues.at(0)?.message;
    },
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

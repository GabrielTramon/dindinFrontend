import { useSyncExternalStore } from "react";
import { validarPerfil } from "@/domain";
import type { SessaoApi } from "@/lib/api";
import {
  anunciarEntrada,
  caminhoDoReferrer,
  guardarRetorno,
  lerRetorno,
  limparRetorno,
  salvarSessao,
  type ComoEntrou,
  type MotivoRetorno,
} from "@/lib/sessao";
import { readJSON, STORAGE_KEYS, subscribeStorage } from "@/lib/storage";

/*
  Peças sem tela que o convite, as telas de entrar e a /conta dividem: "tem
  plano neste navegador?", "já hidratou?", pra onde ir depois de entrar, a frase
  do toast de boas-vindas, o token do #hash e o download por object URL.
  A validação dos campos e a frase de cada erro da API moram em ./validacao.
*/

export { ERRO_EMAIL, mensagemDeErro } from "./validacao";

/** O perfil gravado aqui passa na validação? (é o que decide "Voltar pro plano" x "Montar meu plano") */
export function temPlanoNesteNavegador(): boolean {
  const bruto = readJSON<unknown>(STORAGE_KEYS.perfil, null);
  return bruto !== null && validarPerfil(bruto).ok;
}

const semPlanoNoServidor = () => false;

/** O mesmo, redesenhando quando o perfil muda (nesta aba ou em outra). No servidor, false. */
export function useTemPlano(): boolean {
  return useSyncExternalStore(subscribeStorage, temPlanoNesteNavegador, semPlanoNoServidor);
}

const nuncaMuda = () => () => {};

/** false no servidor e na hidratação; true depois. Evita piscar o formulário pra quem já entrou. */
export function useHidratado(): boolean {
  return useSyncExternalStore(
    nuncaMuda,
    () => true,
    () => false,
  );
}

/* ---------- depois de entrar ---------- */

/**
 * Pra onde ir depois de entrar: o retorno gravado, senão a página de onde a
 * pessoa veio (referrer deste site), senão o plano. Voltar pra tela do plano só
 * faz sentido se ele estiver neste navegador (o plano mora aqui); sem plano, null
 * e a tela de entrar mostra "Pronto" com "Montar meu plano".
 */
export function destinoDepoisDeEntrar(): string | null {
  const temPlano = temPlanoNesteNavegador();
  const caminho = lerRetorno()?.caminho ?? caminhoDoReferrer(document.referrer, window.location.origin);
  if (caminho) {
    const precisaDePlano = caminho.startsWith("/plano/resultado");
    return precisaDePlano && !temPlano ? null : caminho;
  }
  return temPlano ? "/plano/resultado" : null;
}

export interface Entrou {
  email: string;
  /** null = entrou, mas não há plano neste navegador pra onde voltar */
  destino: string | null;
}

/**
 * Fecha uma entrada numa tela de entrar: grava a sessão, decide o destino UMA
 * vez, limpa o retorno e deixa o recado do toast pro destino. null se a sessão
 * não pôde ser gravada (validade já vencida, localStorage bloqueado).
 */
export function concluirEntrada(sessao: SessaoApi, como: ComoEntrou): Entrou | null {
  if (!salvarSessao(sessao)) return null;
  const email = sessao.subscriber.email;
  const motivo = lerRetorno()?.motivo;
  const destino = destinoDepoisDeEntrar();
  limparRetorno();
  if (destino) anunciarEntrada({ email, motivo, como });
  return { email, destino };
}

/**
 * Leva o e-mail digitado pra próxima tela de entrar (entrar ↔ criar conta ↔
 * esqueci a senha) sem pôr o e-mail na URL: ele vai no retorno, que já existe
 * pra isso. Mantém o caminho e o motivo gravados; sem caminho, `caminhoPadrao`,
 * a página de onde a pessoa veio ou, por fim, o plano — que é o mesmo destino de
 * quem entra sem retorno nenhum (destinoDepoisDeEntrar), então não muda pra onde ela vai.
 */
export function lembrarEmail(email: string, caminhoPadrao?: string, motivo?: MotivoRetorno): void {
  const gravado = lerRetorno();
  const caminho =
    gravado?.caminho ??
    caminhoPadrao ??
    caminhoDoReferrer(document.referrer, window.location.origin) ??
    "/plano/resultado";
  guardarRetorno(caminho, gravado?.motivo ?? motivo, email.trim() || gravado?.email);
}

/** A frase do toast de boas-vindas no destino. */
export function fraseDeEntrada(entrada: { email: string; motivo?: MotivoRetorno; como?: ComoEntrou }): string {
  switch (entrada.como) {
    case "criou":
      return "Conta criada. Mandamos um link pra confirmar seu e-mail.";
    case "confirmou":
      return `E-mail confirmado. Você entrou como ${entrada.email}.`;
    case "redefiniu":
      return `Senha nova salva. Você entrou como ${entrada.email}.`;
    default:
      return entrada.motivo === "pdf"
        ? "Você entrou. O PDF já está liberado lá embaixo."
        : `Você entrou como ${entrada.email}.`;
  }
}

/* ---------- o token dos links do e-mail ---------- */

/** O token de "#token=…", se tiver cara de token; senão null. */
export function tokenDoHash(hash: string): string | null {
  if (!hash.startsWith("#")) return null;
  const token = new URLSearchParams(hash.slice(1)).get("token");
  return token && /^[\w-]{16,256}$/.test(token) ? token : null;
}

/**
 * Tira o #token= da barra de endereço NA HORA (antes de qualquer fetch): o
 * token não fica no histórico nem vaza num print.
 */
export function apagarHashDaUrl(): void {
  const { pathname, search } = window.location;
  window.history.replaceState(window.history.state, "", `${pathname}${search}`);
}

/* ---------- download ---------- */

/** Baixa um Blob com o nome dado, sem abrir aba nova. */
export function baixarArquivo(arquivo: Blob, nome: string): void {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  // o navegador já pegou o arquivo no clique; soltar a memória depois
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "setembro de 2026" a partir do ISO da API; null se a data vier estranha. */
export function mesEAno(iso: string): string | null {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(data);
}

/*
  Recado pra próxima tela (hoje só "Conta excluída."): a /conta tem o próprio
  ToastProvider, e um toast disparado lá some no router.replace. Estado de
  módulo, como o anunciarEntrada de @/lib/sessao: o destino consome UMA vez.
*/
let recadoPendente: string | null = null;

export function deixarRecado(mensagem: string): void {
  recadoPendente = mensagem;
}

/** Devolve o recado e apaga (a segunda chamada devolve null). */
export function pegarRecado(): string | null {
  const recado = recadoPendente;
  recadoPendente = null;
  return recado;
}

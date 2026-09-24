"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { CtaLink, ctaClasses } from "@/components/layout/cta-link";
import { useToast } from "@/components/ui/toast";
import { ApiError, verificarToken, type SessaoApi } from "@/lib/api";
import { lerRetorno, sair, useSessao, type Sessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";
import {
  apagarHashDaUrl,
  concluirEntrada,
  mensagemDeErro,
  tokenDoHash,
  useHidratado,
  useTemPlano,
  type Entrou,
} from "./comum";
import { FormEntrar, type RetornoFixo } from "./form-conta";

/*
  /entrar — e-mail e senha. Também abre o link "Confirme seu e-mail" que o
  cadastro manda (/entrar#token=…).

  Estados, na ordem em que um vence o outro:
  1. link na URL (#token=…): "Entrando…" → e-mail confirmado (router.replace pro
     retorno, com o toast "E-mail confirmado. Você entrou como …") · confirmou
     sem plano neste navegador · link que não vale mais (a conta continua
     valendo: o formulário de entrar aparece ali mesmo) · falha de rede (o token
     ainda pode valer: "Tentar de novo" confere o MESMO token);
  2. entrou pelo formulário: "Entrando…" enquanto o router.replace leva pro
     retorno, ou "Pronto, você entrou" se não há plano aqui;
  3. já tem sessão: "Você já entrou";
  4. o formulário.

  O token é de uso único. Ele sai do hash NA HORA (history.replaceState, antes
  do fetch: não fica no histórico nem vaza em print) e o POST /auth/verificar
  acontece UMA vez por token, mesmo com o StrictMode montando o efeito duas
  vezes: a promessa fica num Map de módulo. O estado do link também mora no
  módulo (useSyncExternalStore), porque ele precisa sobreviver a essa remontagem.

  As peças de tela (Titulo, Texto, Acoes, Entrando, ProntoSemPlano, JaEntrou,
  PainelEntrar) servem também pra /conta, /criar-conta, /esqueci-senha e
  /redefinir-senha.
*/

/* ---------- o link do e-mail (estado de módulo) ---------- */

type EstadoLink =
  | { tipo: "nenhum" }
  | { tipo: "verificando"; token: string }
  /** destino null = confirmou, mas não há plano neste navegador pra onde voltar */
  | { tipo: "entrou"; token: string; email: string; destino: string | null }
  | { tipo: "vencido"; token: string }
  /** rede, 5xx ou 429: o link pode continuar valendo */
  | { tipo: "falhou"; token: string; mensagem: string };

const NENHUM: EstadoLink = { tipo: "nenhum" };

let estadoLink: EstadoLink = NENHUM;
const ouvintes = new Set<() => void>();
const verificacoes = new Map<string, Promise<void>>();

function mudarLink(proximo: EstadoLink): void {
  estadoLink = proximo;
  for (const ouvinte of ouvintes) ouvinte();
}

function assinarLink(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

const lerLink = () => estadoLink;
const linkNoServidor = () => NENHUM;

function verificar(token: string): void {
  if (verificacoes.has(token)) return;
  mudarLink({ tipo: "verificando", token });
  const verificacao = verificarToken(token).then(
    (resposta) => {
      const entrou = concluirEntrada(resposta, "confirmou");
      if (!entrou) {
        mudarLink({ tipo: "vencido", token });
        return;
      }
      mudarLink({ tipo: "entrou", token, email: entrou.email, destino: entrou.destino });
    },
    (erro: unknown) => {
      const status = erro instanceof ApiError ? erro.status : 0;
      if (status === 0 || status === 429 || status >= 500) {
        // o token não foi gasto: libera tentar de novo com ele
        verificacoes.delete(token);
        mudarLink({ tipo: "falhou", token, mensagem: mensagemDeErro(erro) });
        return;
      }
      mudarLink({ tipo: "vencido", token });
    },
  );
  verificacoes.set(token, verificacao);
}

/**
 * Lê o #token=, apaga o hash e confere. Sem token: se sobrou um resultado de uma
 * visita anterior (navegação dentro do app), começa limpo.
 */
function capturarLinkDoHash(): void {
  const token = tokenDoHash(window.location.hash);
  if (token) {
    apagarHashDaUrl();
    verificar(token);
    return;
  }
  if (estadoLink.tipo !== "nenhum" && estadoLink.tipo !== "verificando") mudarLink(NENHUM);
}

/* ---------- peças de tela ---------- */

/**
 * h1 que recebe o foco quando aparece no lugar de outro estado (o foco estava
 * num botão que sumiu e caiu no body). Na primeira carga não rouba nada de ninguém.
 */
export function Titulo({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const ativo = document.activeElement;
    if (!ativo || ativo === document.body) ref.current?.focus({ preventScroll: true });
  }, []);
  return (
    <h1
      ref={ref}
      tabIndex={-1}
      className={cn("text-3xl leading-tight font-extrabold tracking-tight text-balance outline-none sm:text-4xl", className)}
    >
      {children}
    </h1>
  );
}

export function Texto({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-base text-pretty text-ink-2 sm:text-lg", className)}>{children}</p>;
}

export function Acoes({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>;
}

/** O e-mail em negrito, quebrando onde precisar (e-mail longo no celular). */
export function EmailForte({ children }: { children: string }) {
  return <strong className="font-bold break-all text-foreground">{children}</strong>;
}

/** Enquanto o router.replace leva a pessoa de volta (ou o link é conferido). */
export function Entrando({ texto }: { texto: string }) {
  return (
    <div role="status" className="grid gap-3">
      <Titulo>Entrando…</Titulo>
      <Texto>{texto}</Texto>
      <div aria-hidden="true" className="skeleton mt-2 h-4 w-48 max-w-full rounded-full" />
    </div>
  );
}

/** Entrou, mas o plano não está neste navegador: não há pra onde voltar. */
export function ProntoSemPlano({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="enter-up grid gap-6">
      <div className="grid gap-3">
        <Titulo>{titulo}</Titulo>
        {children}
        <Texto>
          Seu plano fica guardado no navegador onde você respondeu. Abra o dindin por lá, ou monte um aqui: leva 2
          minutos.
        </Texto>
      </div>
      <Acoes>
        <CtaLink href="/plano" size="lg" transitionTypes={["nav-forward"]}>
          Montar meu plano
        </CtaLink>
        <CtaLink href="/conta" size="lg" variant="secondary" transitionTypes={["nav-forward"]}>
          Ver minha conta
        </CtaLink>
      </Acoes>
    </div>
  );
}

/** Quem abre uma tela de entrar já tendo entrado. */
export function JaEntrou({ sessao }: { sessao: Sessao }) {
  const toast = useToast();
  const temPlano = useTemPlano();
  return (
    <div className="enter-up grid gap-6">
      <div className="grid gap-3">
        <Titulo>Você já entrou</Titulo>
        <Texto>
          Como <EmailForte>{sessao.email}</EmailForte>.
        </Texto>
      </div>
      <Acoes>
        {temPlano ? (
          <CtaLink href="/plano/resultado" size="lg" transitionTypes={["nav-back"]}>
            Voltar pro plano
          </CtaLink>
        ) : (
          <CtaLink href="/plano" size="lg" transitionTypes={["nav-forward"]}>
            Montar meu plano
          </CtaLink>
        )}
        <button
          type="button"
          className={ctaClasses("secondary", "lg")}
          onClick={() => {
            sair();
            toast.mostrar("Você saiu. O plano continua aqui neste navegador.");
          }}
        >
          Sair
        </button>
      </Acoes>
    </div>
  );
}

/**
 * O e-mail que a pessoa digitou numa outra tela de entrar (vai pelo retorno).
 * Só depois de hidratar: no servidor não há localStorage, e um valor diferente
 * no primeiro render quebraria a hidratação. Lido UMA vez: quem usa remonta o
 * formulário quando ele aparece, e uma escrita depois (o "Esqueci a senha"
 * grava o e-mail antes de navegar) não pode remontar de novo no meio do caminho.
 */
export function useEmailLembrado(): string | undefined {
  const hidratado = useHidratado();
  return useMemo(() => (hidratado ? lerRetorno()?.email : undefined), [hidratado]);
}

interface PainelEntrarProps {
  titulo?: string;
  /** frase de cima (opcional) */
  texto?: ReactNode;
  /** aviso acima do título (ex.: sessão expirou) */
  aviso?: string | null;
  /** retorno fixo pros links que saem daqui (a /conta usa "/conta") */
  retorno?: RetornoFixo;
  /** grava a sessão e segue; false = não deu pra gravar */
  onEntrou: (sessao: SessaoApi) => boolean;
}

/** O bloco de entrar com e-mail e senha: /entrar, /conta sem sessão e o link de confirmação vencido. */
export function PainelEntrar({ titulo = "Entrar", texto, aviso, retorno, onEntrou }: PainelEntrarProps) {
  const emailLembrado = useEmailLembrado();
  return (
    <div className="grid gap-6">
      {aviso && (
        <p role="alert" className="rounded-2xl bg-warn-soft px-4 py-3 text-sm font-semibold text-pretty text-warn">
          {aviso}
        </p>
      )}
      <div className="grid gap-3">
        <Titulo>{titulo}</Titulo>
        {texto && <Texto>{texto}</Texto>}
      </div>
      {/* a chave remonta o formulário quando o e-mail lembrado aparece (depois da hidratação) */}
      <FormEntrar
        key={emailLembrado ?? ""}
        id="entrar"
        emailInicial={emailLembrado}
        retorno={retorno}
        onSucesso={onEntrou}
        comLinkDeTroca
      />
      <p className="border-t pt-4 text-sm text-pretty text-muted-foreground">
        A conta serve pra baixar o PDF do plano. Todo o resto continua grátis e sem cadastro.
      </p>
    </div>
  );
}

/* ---------- a página ---------- */

export function Entrar() {
  const router = useRouter();
  const hidratado = useHidratado();
  const sessao = useSessao();
  const link = useSyncExternalStore(assinarLink, lerLink, linkNoServidor);
  const [entrou, setEntrou] = useState<Entrou | null>(null);

  // antes da pintura: quem chega com #token= não vê o formulário piscar
  // e quem cola o link na MESMA aba do /entrar não recarrega a página (só o hash muda)
  useLayoutEffect(() => {
    capturarLinkDoHash();
    window.addEventListener("hashchange", capturarLinkDoHash);
    return () => window.removeEventListener("hashchange", capturarLinkDoHash);
  }, []);

  const destino = link.tipo === "entrou" ? link.destino : (entrou?.destino ?? null);
  useEffect(() => {
    if (destino) router.replace(destino);
  }, [destino, router]);

  function entrouComSenha(resposta: SessaoApi): boolean {
    let ok = false;
    /* gravar a sessão redesenha pelo useSessao (prioridade síncrona) e o setEntrou
       viria num render depois: sem o flushSync, "Você já entrou" piscava um quadro */
    flushSync(() => {
      const resultado = concluirEntrada(resposta, "entrou");
      if (!resultado) return;
      ok = true;
      // o link de confirmação (se tinha um na tela) já não importa
      if (estadoLink.tipo !== "nenhum") mudarLink(NENHUM);
      setEntrou(resultado);
    });
    return ok;
  }

  if (link.tipo === "verificando" || (link.tipo === "entrou" && link.destino)) {
    return <Entrando texto="Conferindo seu link." />;
  }

  if (link.tipo === "entrou") {
    return (
      <ProntoSemPlano titulo="E-mail confirmado">
        <Texto>
          Você entrou como <EmailForte>{link.email}</EmailForte>.
        </Texto>
      </ProntoSemPlano>
    );
  }

  if (link.tipo === "falhou") {
    const token = link.token;
    return (
      <div className="enter-up grid gap-6">
        <div className="grid gap-3">
          <Titulo>Não deu pra conferir seu link</Titulo>
          <Texto>{link.mensagem}</Texto>
        </div>
        <Acoes>
          <button type="button" className={ctaClasses("primary", "lg")} onClick={() => verificar(token)}>
            Tentar de novo
          </button>
        </Acoes>
      </div>
    );
  }

  if (entrou?.destino) return <Entrando texto="Levando você de volta." />;

  if (entrou) {
    return (
      <ProntoSemPlano titulo="Pronto, você entrou">
        <Texto>
          Como <EmailForte>{entrou.email}</EmailForte>.
        </Texto>
      </ProntoSemPlano>
    );
  }

  if (link.tipo === "vencido") {
    return (
      <PainelEntrar
        titulo="Esse link não vale mais"
        texto="O link de confirmação expirou ou já foi usado. Sua conta continua valendo: é só entrar com e-mail e senha."
        onEntrou={entrouComSenha}
      />
    );
  }

  if (hidratado && sessao) return <JaEntrou sessao={sessao} />;

  return <PainelEntrar onEntrou={entrouComSenha} />;
}

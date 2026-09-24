"use client";

import { Tabs } from "@base-ui/react/tabs";
import { FileDown } from "lucide-react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { ctaClasses } from "@/components/layout/cta-link";
import { Drawer } from "@/components/ui/drawer";
import type { SessaoApi } from "@/lib/api";
import { salvarSessao, useSessao } from "@/lib/sessao";
import { cn } from "@/lib/utils";
import { FormCriarConta, FormEntrar, type RetornoFixo } from "./form-conta";

/*
  A gaveta que o "Baixar PDF" abre pra quem não entrou (ou cuja sessão o
  servidor recusou). Diz ANTES de pedir o e-mail que o PDF chega na próxima
  atualização (enxerto do júri): ninguém cria conta esperando um arquivo que não vem.

  Duas abas, sem sair da tela: "Criar conta" e "Já tenho conta" (Tabs do
  base-ui: setas trocam de aba, a pílula desliza; em reduced-motion só troca).
  O e-mail digitado vai de uma aba pra outra; a senha não. O 409 do cadastro
  ("já existe conta") troca pra aba de entrar com o e-mail preenchido.

  Deu certo: grava a sessão, a gaveta fecha e o BotaoPdf segue pro PDF — que
  confere a sessão no servidor de novo antes de liberar. "Esqueci a senha" leva
  pro /esqueci-senha com o retorno { plano, motivo "pdf" }.

  Se a pessoa entrar em OUTRA aba com a gaveta aberta, o evento storage chega
  aqui (useSessao) e a gaveta troca sozinha, com o botão de baixar.
*/

export type AbaConvite = "criar" | "entrar";

const RETORNO_PDF: RetornoFixo = { caminho: "/plano/resultado", motivo: "pdf" };

const abaClasses = cn(
  "flex h-11 min-w-0 cursor-pointer items-center justify-center rounded-xl px-3 text-sm font-bold whitespace-nowrap text-ink-2 outline-none select-none",
  "transition-colors duration-(--duration-base) hover:text-foreground motion-reduce:transition-none data-active:text-foreground",
  "focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted",
);

interface ConviteContaProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aba: AbaConvite;
  onAbaChange: (aba: AbaConvite) => void;
  /** o e-mail que vai de uma aba pra outra (e vem preenchido quando a sessão venceu) */
  email: string;
  onEmailChange: (email: string) => void;
  /** linha de aviso em cima das abas (ex.: "Sua sessão venceu…") */
  aviso?: string | null;
  /** entrou por aqui: a sessão já está gravada */
  onEntrou: (como: "criou" | "entrou", email: string) => void;
  /** "Baixar PDF" depois que a pessoa entrou em outra aba */
  onBaixar: () => void;
}

export function ConviteConta({
  open,
  onOpenChange,
  aba,
  onAbaChange,
  email,
  onEmailChange,
  aviso,
  onEntrou,
  onBaixar,
}: ConviteContaProps) {
  const sessao = useSessao();
  const emailRef = useRef<HTMLInputElement>(null);
  const senhaRef = useRef<HTMLInputElement>(null);
  // entrou por aqui: segura os formulários na tela enquanto a gaveta fecha (sem piscar "Pronto, você entrou")
  const [concluindo, setConcluindo] = useState(false);
  const mostrarEntrou = Boolean(sessao) && !concluindo;

  function sucesso(resposta: SessaoApi, como: "criou" | "entrou"): boolean {
    let ok = false;
    // a sessão redesenha pelo useSessao em prioridade síncrona: o "concluindo" tem de ir no mesmo render
    flushSync(() => {
      if (!salvarSessao(resposta)) return;
      ok = true;
      setConcluindo(true);
    });
    if (ok) onEntrou(como, resposta.subscriber.email);
    return ok;
  }

  const titulo = mostrarEntrou
    ? "Pronto, você entrou"
    : aba === "entrar"
      ? "Entre pra baixar o PDF"
      : "Crie sua conta pra baixar o PDF";

  const descricao = mostrarEntrou
    ? null
    : "O PDF do plano chega na próxima atualização do dindin. Com a conta pronta, ele libera aqui sozinho.";

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      onOpenChangeComplete={(aberto) => {
        if (!aberto) setConcluindo(false);
      }}
      title={titulo}
      description={descricao}
      /* no toque, não abre o teclado por cima da explicação; no mouse/teclado, já
         no campo — na senha, quando o e-mail veio preenchido (sessão vencida) */
      initialFocus={(tipo) => {
        if (tipo === "touch") return true;
        const campo = email.trim() && aba === "entrar" ? senhaRef.current : emailRef.current;
        return campo ?? true;
      }}
    >
      {mostrarEntrou && sessao ? (
        <div className="enter-up grid gap-5">
          <p className="text-base text-pretty text-ink-2">
            Você entrou como <strong className="font-bold break-all text-foreground">{sessao.email}</strong>. O PDF
            está liberado.
          </p>
          <button
            type="button"
            autoFocus
            onClick={onBaixar}
            className={cn(ctaClasses("primary", "lg"), "w-full sm:w-auto sm:justify-self-start")}
          >
            <FileDown aria-hidden="true" className="size-5" />
            Baixar PDF
          </button>
        </div>
      ) : (
        <div className="grid gap-5">
          {aviso && (
            <p role="alert" className="rounded-2xl bg-warn-soft px-4 py-3 text-sm font-semibold text-pretty text-warn">
              {aviso}
            </p>
          )}
          <Tabs.Root value={aba} onValueChange={(valor) => onAbaChange(valor === "entrar" ? "entrar" : "criar")}>
            <Tabs.List
              aria-label="Criar conta ou entrar"
              className="relative isolate grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1"
            >
              <Tabs.Tab value="criar" className={abaClasses}>
                Criar conta
              </Tabs.Tab>
              <Tabs.Tab value="entrar" className={abaClasses}>
                Já tenho conta
              </Tabs.Tab>
              <Tabs.Indicator
                className={cn(
                  "absolute top-1 left-0 -z-10 h-11 w-(--active-tab-width) translate-x-(--active-tab-left) rounded-xl",
                  "bg-card shadow-card ring-1 ring-border/60 dark:bg-primary/15 dark:ring-primary/30",
                  "transition-[translate,width] duration-(--duration-base) ease-out-expo motion-reduce:transition-none",
                )}
              />
            </Tabs.List>
            <Tabs.Panel value="criar" className="rounded-2xl pt-5 outline-none">
              <FormCriarConta
                id="convite-criar"
                emailInicial={email}
                onEmailChange={onEmailChange}
                emailRef={emailRef}
                retorno={RETORNO_PDF}
                onSucesso={(resposta) => sucesso(resposta, "criou")}
                onJaTemConta={(digitado) => {
                  onEmailChange(digitado);
                  onAbaChange("entrar");
                  // o botão que foi tocado sumiu com a aba: o foco vai pro e-mail já preenchido
                  requestAnimationFrame(() => emailRef.current?.focus({ preventScroll: true }));
                }}
              />
            </Tabs.Panel>
            <Tabs.Panel value="entrar" className="rounded-2xl pt-5 outline-none">
              <FormEntrar
                id="convite-entrar"
                emailInicial={email}
                onEmailChange={onEmailChange}
                emailRef={emailRef}
                senhaRef={senhaRef}
                retorno={RETORNO_PDF}
                onSucesso={(resposta) => sucesso(resposta, "entrou")}
              />
            </Tabs.Panel>
          </Tabs.Root>
        </div>
      )}
    </Drawer>
  );
}

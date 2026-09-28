"use client";

import Link from "next/link";
import { CheckDraw } from "@/components/ui/drawn-icon";
import { lembrarEmail } from "./comum";
import { EmailForte, Texto, Titulo, useEmailLembrado } from "./entrar";
import { ConfiraEmail, FormEmail, usePedidoDeLink } from "./form-email";

/*
  /esqueci-senha — o e-mail da conta → "Confira seu e-mail", com "Mandar de
  novo" depois de 60 s. A resposta da API é a mesma exista a conta ou não, e a
  tela também: nada aqui revela quem tem conta.

  O e-mail vai pro retorno antes do POST (lembrarEmail): o link abre noutra aba
  (a do e-mail), e é o retorno que leva o /redefinir-senha de volta pro lugar
  certo — o plano, com o motivo "pdf" se a pessoa veio da gaveta.
*/

const EM_DESENVOLVIMENTO = process.env.NODE_ENV === "development";

const linkClasses =
  "inline-flex min-h-11 items-center rounded-full font-bold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function EsqueciSenha() {
  const emailLembrado = useEmailLembrado();
  const pedido = usePedidoDeLink((email) => lembrarEmail(email));

  if (pedido.fase === "enviado") {
    return (
      <div className="enter-up grid gap-6">
        <h1 className="flex items-center gap-3 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
            <CheckDraw className="size-5" />
          </span>
          Confira seu e-mail
        </h1>
        <ConfiraEmail pedido={pedido} dica="Não chegou? Olhe o spam ou mande de novo.">
          Se existir uma conta com <EmailForte>{pedido.email}</EmailForte>, o link pra criar uma senha nova chega em
          instantes. Abra neste mesmo navegador pra voltar direto pro seu plano.
        </ConfiraEmail>
        {EM_DESENVOLVIMENTO && (
          <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-pretty text-ink-2">
            Em desenvolvimento o e-mail não sai de verdade: o link aparece no terminal da API.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-3">
        <Titulo>Esqueci a senha</Titulo>
        <Texto>Diga o e-mail da sua conta: mandamos um link pra você criar uma senha nova.</Texto>
      </div>
      {/* a chave remonta o formulário quando o e-mail lembrado aparece (depois da hidratação) */}
      <FormEmail
        key={emailLembrado ?? ""}
        id="esqueci-email"
        pedido={pedido}
        // "Usar outro e-mail" volta com o último que foi mandado, pra corrigir só o que errou
        emailInicial={pedido.email || emailLembrado}
        rotuloBotao="Mandar link"
      />
      <p className="text-sm text-pretty text-ink-2">
        Lembrou?{" "}
        <Link href="/entrar" transitionTypes={["nav-back"]} className={linkClasses}>
          Entrar
        </Link>
      </p>
    </div>
  );
}

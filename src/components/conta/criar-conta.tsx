"use client";

import { useSessao } from "@/lib/sessao";
import { useHidratado } from "./comum";
import { ConfiraConfirmacao, usePedidoDeConfirmacao } from "./confirmar-email";
import { JaEntrou, Titulo, useEmailLembrado } from "./entrar";
import { FormCriarConta } from "./form-conta";

/*
  /criar-conta — e-mail e senha. A conta só passa a valer quando a pessoa abre o
  link do "Confirme seu e-mail" (decisão do dono, 14/10/2026): o cadastro não
  entra, mostra "Confira seu e-mail" com "Mandar de novo" (60 s) e "Usar outro
  e-mail". O link (/entrar#token=…) confirma, entra e volta pro retorno que já
  estava gravado — o plano, quando ela veio de lá.

  Confirmou noutra aba (o link do e-mail costuma abrir uma aba nova): a sessão
  chega aqui pelo evento storage (useSessao) e a tela vira "Você já entrou".

  409 (e-mail de conta confirmada): a frase da API no campo do e-mail, com
  "Entrar" e "Esqueci a senha".
*/

export function CriarConta() {
  const hidratado = useHidratado();
  const sessao = useSessao();
  const emailLembrado = useEmailLembrado();
  const pedido = usePedidoDeConfirmacao();

  if (hidratado && sessao) return <JaEntrou sessao={sessao} />;

  if (pedido.fase === "enviado") {
    return (
      <div className="enter-up grid gap-6">
        <Titulo>Confirme seu e-mail</Titulo>
        <ConfiraConfirmacao pedido={pedido} />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Titulo>Criar conta grátis</Titulo>
      {/* a chave remonta o formulário quando o e-mail lembrado aparece (depois da hidratação);
          voltando de "Usar outro e-mail", ele vem com o e-mail que ela tinha usado */}
      <FormCriarConta
        key={pedido.email || emailLembrado || ""}
        id="criar-conta"
        emailInicial={pedido.email || emailLembrado}
        onLinkEnviado={pedido.marcarEnviado}
        comLinkDeTroca
      />
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import type { SessaoApi } from "@/lib/api";
import { useSessao } from "@/lib/sessao";
import { concluirEntrada, useHidratado, type Entrou } from "./comum";
import { EmailForte, Entrando, JaEntrou, ProntoSemPlano, Texto, Titulo, useEmailLembrado } from "./entrar";
import { FormCriarConta } from "./form-conta";

/*
  /criar-conta — e-mail e senha, e a pessoa já entra (sem esperar e-mail). O
  "Confirme seu e-mail" vai junto, mas não trava nada.

  Deu certo: grava a sessão e volta pro retorno (ou pro plano) com o toast
  "Conta criada. Mandamos um link pra confirmar seu e-mail."; sem plano neste
  navegador, "Conta criada" com "Montar meu plano". 409 (e-mail já tem conta):
  a frase da API no campo do e-mail, com "Entrar" e "Esqueci a senha".
*/

export function CriarConta() {
  const router = useRouter();
  const hidratado = useHidratado();
  const sessao = useSessao();
  const emailLembrado = useEmailLembrado();
  const [entrou, setEntrou] = useState<Entrou | null>(null);

  const destino = entrou?.destino ?? null;
  useEffect(() => {
    if (destino) router.replace(destino);
  }, [destino, router]);

  function criou(resposta: SessaoApi): boolean {
    let ok = false;
    // junto com a sessão, senão "Você já entrou" pisca um quadro (ver o /entrar)
    flushSync(() => {
      const resultado = concluirEntrada(resposta, "criou");
      if (!resultado) return;
      ok = true;
      setEntrou(resultado);
    });
    return ok;
  }

  if (entrou?.destino) return <Entrando texto="Levando você de volta." />;

  if (entrou) {
    return (
      <ProntoSemPlano titulo="Conta criada">
        <Texto>
          Você já entrou. Mandamos um link pra confirmar <EmailForte>{entrou.email}</EmailForte>.
        </Texto>
      </ProntoSemPlano>
    );
  }

  if (hidratado && sessao) return <JaEntrou sessao={sessao} />;

  return (
    <div className="grid gap-6">
      <Titulo>Criar conta grátis</Titulo>
      {/* a chave remonta o formulário quando o e-mail lembrado aparece (depois da hidratação) */}
      <FormCriarConta key={emailLembrado ?? ""} id="criar-conta" emailInicial={emailLembrado} onSucesso={criou} comLinkDeTroca />
    </div>
  );
}

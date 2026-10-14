"use client";

import { UserRound, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Dica } from "@/components/layout/dica";
import { ICONE_DO_HEADER } from "@/components/layout/header-estilos";
import { guardarRetorno, useSessao, validarSessaoEmSegundoPlano } from "@/lib/sessao";
import { cn } from "@/lib/utils";

/*
  O ponto fixo de conta no header: um botão-ícone, par do tema no canto
  direito (o nome vai no aria-label e na Dica do hover).
  - Sem sessão: ícone de pessoa, "Entrar" → /entrar. Antes de ir, grava o
    caminho atual como retorno (guardarRetornoDaPagina): depois de entrar, a
    pessoa volta pra onde estava. Numa tela de entrar (/entrar, /criar-conta,
    /esqueci-senha, /redefinir-senha), não grava nada (guardarRetorno recusa:
    o retorno que trouxe a pessoa até ali vale).
  - Com sessão: ícone de pessoa com o visto, em esmeralda, "Sua conta" →
    /conta. O e-mail não aparece aqui: tela de celular se mostra pros outros.
  - Na própria página do link, aria-current="page" (fundo accent).

  A aba percebe login e logout feitos em outra (useSessao ouve o evento
  storage). Ao montar com sessão, um GET /me por carregamento confere o token:
  401 desloga, rede não.
*/

/** Grava a página atual como o retorno de quem vai entrar (o menu do celular usa também). */
export function guardarRetornoDaPagina() {
  const { pathname, search, hash } = window.location;
  if (pathname === "/entrar") return;
  guardarRetorno(`${pathname}${search}${hash}`);
}

export function ContaLink({ className }: { className?: string }) {
  const sessao = useSessao();
  const pathname = usePathname();

  useEffect(() => {
    if (sessao) void validarSessaoEmSegundoPlano();
  }, [sessao]);

  if (sessao) {
    return (
      <Link
        href="/conta"
        transitionTypes={["nav-forward"]}
        aria-label="Sua conta"
        aria-current={pathname === "/conta" ? "page" : undefined}
        className={cn(ICONE_DO_HEADER, "text-primary hover:text-primary", className)}
      >
        <UserRoundCheck aria-hidden="true" className="size-5" />
        <Dica>Sua conta</Dica>
      </Link>
    );
  }

  return (
    <Link
      href="/entrar"
      transitionTypes={["nav-forward"]}
      aria-label="Entrar"
      aria-current={pathname === "/entrar" ? "page" : undefined}
      className={cn(ICONE_DO_HEADER, className)}
      onClick={guardarRetornoDaPagina}
    >
      <UserRound aria-hidden="true" className="size-5" />
      <Dica>Entrar</Dica>
    </Link>
  );
}

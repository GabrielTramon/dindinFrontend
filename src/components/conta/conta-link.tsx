"use client";

import { LogIn, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ctaClasses } from "@/components/layout/cta-link";
import { guardarRetorno, useSessao, validarSessaoEmSegundoPlano } from "@/lib/sessao";
import { cn } from "@/lib/utils";

/*
  O ponto fixo de conta no header (SiteHeader, nos dois variants).
  - Sem sessão: pílula "Entrar" → /entrar. Antes de ir, grava o caminho atual
    como retorno: depois de entrar, a pessoa volta pra onde estava. Numa tela
    de entrar (/entrar, /criar-conta, /esqueci-senha, /redefinir-senha), não
    grava nada (guardarRetorno recusa: o retorno que trouxe a pessoa até ali vale).
  - Com sessão: "Conta" → /conta. O e-mail não aparece aqui: tela de celular se
    mostra pros outros.
  - Na própria página do link, aria-current="page".

  A aba percebe login e logout feitos em outra (useSessao ouve o evento
  storage). Ao montar com sessão, um GET /me por carregamento confere o token:
  401 desloga, rede não.
*/

export function ContaLink({ className }: { className?: string }) {
  const sessao = useSessao();
  const pathname = usePathname();

  useEffect(() => {
    if (sessao) void validarSessaoEmSegundoPlano();
  }, [sessao]);

  const classes = cn(ctaClasses("ghost"), "px-4", className);

  if (sessao) {
    return (
      <Link
        href="/conta"
        transitionTypes={["nav-forward"]}
        aria-current={pathname === "/conta" ? "page" : undefined}
        className={classes}
      >
        <User aria-hidden="true" className="size-4" />
        Conta
      </Link>
    );
  }

  return (
    <Link
      href="/entrar"
      transitionTypes={["nav-forward"]}
      aria-current={pathname === "/entrar" ? "page" : undefined}
      className={classes}
      onClick={() => {
        const { pathname: atual, search, hash } = window.location;
        if (atual === "/entrar") return;
        guardarRetorno(`${atual}${search}${hash}`);
      }}
    >
      <LogIn aria-hidden="true" className="size-4" />
      Entrar
    </Link>
  );
}

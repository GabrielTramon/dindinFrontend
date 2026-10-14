import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ContaLink } from "@/components/conta/conta-link";
import { HeaderSentinel } from "@/components/layout/header-sentinel";
import { MenuMobile } from "@/components/layout/menu-mobile";
import { NavLink } from "@/components/layout/nav-link";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/*
  Cabeçalho do site, o mesmo em todas as páginas. A marca fica à esquerda;
  tudo o mais fica à direita, em dois blocos:
  - as páginas (Como funciona, Juros compostos, Montar meu plano), todas com a
    mesma cara de link — "Montar meu plano" inclusive: o botão preenchido do
    convite mora no corpo das páginas, não aqui;
  - depois de uma divisória, isolados no canto, o tema e a conta: dois
    botões-ícone de 44px (a conta é o ícone de pessoa, com a Dica no hover).

  Abaixo de 768px os links não cabem na linha: viram o menu do hambúrguer
  (MenuMobile, com todas as páginas), que fica no canto, depois do tema e da
  conta.

  Vidro sticky de altura fixa (64px, sem layout shift): ganha hairline e sombra
  ao sair do topo (HeaderSentinel → data-scrolled). Fica FORA do PageTransition
  e é ancorado nas transições de rota por `vt-header`.
  Container padrão do site: mx-auto w-full max-w-5xl px-4 sm:px-6
*/

export function SiteHeader() {
  return (
    <>
      <HeaderSentinel headerId="site-header" />
      <header
        id="site-header"
        className="vt-header glass sticky top-0 z-40 w-full border-b border-transparent transition-[border-color,box-shadow] duration-(--duration-base) ease-out-expo data-scrolled:border-glass-border data-scrolled:shadow-glass motion-reduce:transition-none"
      >
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center px-4 sm:px-6">
          <Link
            href="/"
            transitionTypes={["nav-back"]}
            aria-label="dindin — início"
            className="press -mx-2 mr-auto inline-flex min-h-11 shrink-0 items-center rounded-full px-2 outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Logo />
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            <NavLink href="/#como-funciona">Como funciona</NavLink>
            <NavLink href="/calculadoras/juros-compostos">Juros compostos</NavLink>
            <NavLink href="/plano">Montar meu plano</NavLink>
          </nav>

          {/* o canto: tema e conta, separados das páginas */}
          <span aria-hidden="true" className="mx-3 hidden h-6 w-px bg-border md:block" />
          <div className="-mr-2 flex items-center gap-1">
            <ThemeToggle />
            <ContaLink />
            <MenuMobile className="md:hidden" />
          </div>
        </div>
      </header>
    </>
  );
}

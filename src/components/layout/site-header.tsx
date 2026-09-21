import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { CtaLink } from "@/components/layout/cta-link";
import { HeaderSentinel } from "@/components/layout/header-sentinel";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/*
  Cabeçalho do site. `full` na home (nav + toggle + CTA); `minimal` dentro do
  fluxo do plano, onde a única saída deve ser voltar pro início.
  Vidro sticky de altura fixa (64px, sem layout shift): ganha hairline e sombra
  ao sair do topo (HeaderSentinel → data-scrolled). Fica FORA do PageTransition
  e é ancorado nas transições de rota por `vt-header`.
  Container padrão do site: mx-auto w-full max-w-5xl px-4 sm:px-6
*/

type SiteHeaderProps = {
  variant?: "full" | "minimal";
};

export function SiteHeader({ variant = "full" }: SiteHeaderProps) {
  return (
    <>
      <HeaderSentinel headerId="site-header" />
      <header
        id="site-header"
        className="vt-header glass sticky top-0 z-40 w-full border-b border-transparent transition-[border-color,box-shadow] duration-(--duration-base) ease-out-expo data-scrolled:border-glass-border data-scrolled:shadow-glass motion-reduce:transition-none"
      >
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            transitionTypes={["nav-back"]}
            aria-label="dindin — início"
            className="press -mx-2 inline-flex min-h-11 items-center rounded-full px-2 outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Logo />
          </Link>

          {variant === "full" ? (
            <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/#como-funciona"
                className="press relative hidden min-h-11 rounded-full px-3 py-2 text-sm font-bold text-ink-2 outline-none after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-[scale] after:duration-(--duration-base) after:ease-out-expo hover:text-foreground hover:after:scale-x-100 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:after:transition-none sm:inline-flex"
              >
                Como funciona
              </Link>
              <ThemeToggle />
              <CtaLink href="/plano" transitionTypes={["nav-forward"]}>
                Montar meu plano
              </CtaLink>
            </nav>
          ) : (
            <div className="flex items-center gap-2">
              <span className="eyebrow sr-only min-[400px]:not-sr-only">Sem cadastro</span>
              <ThemeToggle />
            </div>
          )}
        </div>
      </header>
    </>
  );
}

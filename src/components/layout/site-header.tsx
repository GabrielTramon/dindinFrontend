import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ContaLink } from "@/components/conta/conta-link";
import { CtaLink } from "@/components/layout/cta-link";
import { HeaderSentinel } from "@/components/layout/header-sentinel";
import { NavLink } from "@/components/layout/nav-link";
import { ThemeToggle } from "@/components/theme/theme-toggle";

/*
  Cabeçalho do site, em três blocos: a marca, a navegação (só no `full`, colada
  na marca) e as ações, sempre na ponta direita e sempre nesta ordem: tema,
  conta, CTA. `full` na home, na calculadora e na 404; `minimal` dentro do
  fluxo do plano e nas telas de conta (marca + tema + conta).

  As duas ações são um par: a mesma pílula de 44px (o alvo de toque), a mesma
  fonte e o mesmo respiro. A conta é contornada (`outline`); o CTA é o único
  preenchido (`solid`), sem o glow do CTA do corpo da página, que aqui brigava
  com o resto da linha.

  O que aparece em cada largura:
  - "Como funciona" a partir de 640px; "Juros compostos" a partir de 768px (no
    celular, o caminho pra calculadora é o rodapé);
  - a conta, no `full`, a partir de 420px: abaixo disso ela apertaria o CTA, que
    é quem importa na home. No `minimal`, sempre.

  Vidro sticky de altura fixa (64px, sem layout shift): ganha hairline e sombra
  ao sair do topo (HeaderSentinel → data-scrolled). Fica FORA do PageTransition
  e é ancorado nas transições de rota por `vt-header`.
  Container padrão do site: mx-auto w-full max-w-5xl px-4 sm:px-6
*/

type SiteHeaderProps = {
  variant?: "full" | "minimal";
};

export function SiteHeader({ variant = "full" }: SiteHeaderProps) {
  const full = variant === "full";

  return (
    <>
      <HeaderSentinel headerId="site-header" />
      <header
        id="site-header"
        className="vt-header glass sticky top-0 z-40 w-full border-b border-transparent transition-[border-color,box-shadow] duration-(--duration-base) ease-out-expo data-scrolled:border-glass-border data-scrolled:shadow-glass motion-reduce:transition-none"
      >
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-1 px-4 sm:gap-2 sm:px-6">
          <Link
            href="/"
            transitionTypes={["nav-back"]}
            aria-label="dindin — início"
            className="press -mx-2 inline-flex min-h-11 shrink-0 items-center rounded-full px-2 outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Logo />
          </Link>

          {full && (
            <nav aria-label="Principal" className="ml-4 hidden items-center gap-1 sm:flex lg:ml-6">
              <NavLink href="/#como-funciona">Como funciona</NavLink>
              <NavLink href="/calculadoras/juros-compostos" className="hidden md:inline-flex">
                Juros compostos
              </NavLink>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <ContaLink className={full ? "hidden min-[420px]:inline-flex" : undefined} />
            {full && (
              <CtaLink href="/plano" variant="solid" className="px-4" transitionTypes={["nav-forward"]}>
                {/* rótulo curto abaixo de 360px (o completo não cabe ao lado do logo em
                    320) e de 420 a 480px, quando a conta aparece e divide a linha */}
                <span className="min-[360px]:hidden min-[420px]:inline min-[480px]:hidden">Montar plano</span>
                <span className="hidden min-[360px]:inline min-[420px]:hidden min-[480px]:inline">
                  Montar meu plano
                </span>
              </CtaLink>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

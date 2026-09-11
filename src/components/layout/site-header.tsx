import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { CtaLink } from "@/components/layout/cta-link";

/*
  Cabeçalho do site. `full` na home (nav + CTA); `minimal` dentro do fluxo
  do plano, onde a única saída deve ser voltar pro início.
  Container padrão do site: mx-auto w-full max-w-5xl px-4 sm:px-6
*/

type SiteHeaderProps = {
  variant?: "full" | "minimal";
};

export function SiteHeader({ variant = "full" }: SiteHeaderProps) {
  return (
    <header className="w-full">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          aria-label="dindin — início"
          className="-mx-2 inline-flex min-h-11 items-center rounded-full px-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Logo />
        </Link>

        {variant === "full" ? (
          <nav aria-label="Principal" className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/#como-funciona"
              className="hidden rounded-full px-3 py-2 text-sm font-bold text-ink-2 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:inline-flex"
            >
              Como funciona
            </Link>
            <CtaLink href="/plano">Montar meu plano</CtaLink>
          </nav>
        ) : (
          <span className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
            Sem cadastro
          </span>
        )}
      </div>
    </header>
  );
}

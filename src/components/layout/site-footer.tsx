import Link from "next/link";
import { Logo } from "@/components/brand/logo";

/*
  Rodapé. Carrega o disclaimer que precisa estar em toda página com conteúdo
  financeiro — não é enfeite, é o limite regulatório do produto. E os caminhos
  pras ferramentas abertas (o plano e a calculadora): no celular, o cabeçalho
  não tem espaço pro link da calculadora, e é aqui que ele mora.
*/

const LINK =
  "inline-flex min-h-11 items-center rounded-full px-2 font-bold text-ink-2 underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function SiteFooter() {
  const ano = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="grid gap-3">
          <Logo markClassName="size-5" wordClassName="text-base" />
          <nav aria-label="Ferramentas" className="-ml-2 flex flex-wrap gap-x-1 text-sm">
            <Link href="/plano" className={LINK}>
              Montar meu plano
            </Link>
            <Link href="/calculadoras/juros-compostos" className={LINK}>
              Calculadora de juros compostos
            </Link>
          </nav>
        </div>

        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          Conteúdo educacional sobre organização financeira. O dindin não recomenda produtos,
          bancos, corretoras ou investimentos específicos e não substitui um profissional. Seu
          plano fica só no seu navegador. A conta, se você criar, guarda só o seu e-mail e a senha
          protegida (nunca em texto).
        </p>

        <p className="text-xs text-muted-foreground tnum">© {ano} dindin</p>
      </div>
    </footer>
  );
}

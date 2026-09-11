import { Logo } from "@/components/brand/logo";

/*
  Rodapé. Carrega o disclaimer que precisa estar em toda página com conteúdo
  financeiro — não é enfeite, é o limite regulatório do produto.
*/

export function SiteFooter() {
  const ano = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-start md:justify-between">
        <Logo markClassName="size-5" wordClassName="text-base" />

        <p className="max-w-md text-xs leading-relaxed text-muted-foreground">
          Conteúdo educacional sobre organização financeira. O dindin não recomenda produtos,
          bancos, corretoras ou investimentos específicos e não substitui um profissional. Seus
          dados ficam só no seu navegador.
        </p>

        <p className="text-xs text-muted-foreground tnum">© {ano} dindin</p>
      </div>
    </footer>
  );
}

import type { Metadata } from "next";
import { CtaLink } from "@/components/layout/cta-link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PageTransition } from "@/components/motion/page-transition";

/*
  404 do site: qualquer endereço que não existe cai aqui, dentro do layout raiz
  (tema, fonte e lang pt-BR). Mesma moldura da home — header, <main>, rodapé —
  e duas saídas: montar o plano ou voltar pro início. O Next já injeta um
  noindex, mas o layout raiz declara "index, follow": sem o robots daqui, a
  404 sairia com as duas metas brigando.
*/

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <PageTransition>
        <main className="flex flex-1 flex-col">
          <section aria-labelledby="nao-encontrada-titulo" className="bg-mesh flex-1 py-16 sm:py-24">
            <div className="mx-auto flex w-full max-w-5xl flex-col items-start px-4 sm:px-6">
              <p className="eyebrow text-primary">Erro 404</p>
              <h1
                id="nao-encontrada-titulo"
                className="mt-3 text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl"
              >
                Essa página não existe.
              </h1>
              <p className="mt-4 max-w-prose text-lg text-ink-2">
                O endereço pode ter mudado ou ter sido digitado errado. Volte pro início ou monte
                o seu plano agora: são 9 perguntas e 2 minutos.
              </p>
              <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                <CtaLink href="/plano" size="lg" transitionTypes={["nav-forward"]}>
                  Montar meu plano
                </CtaLink>
                <CtaLink href="/" variant="ghost" size="lg" transitionTypes={["nav-back"]}>
                  Voltar pro início
                </CtaLink>
              </div>
            </div>
          </section>
        </main>
        <SiteFooter />
      </PageTransition>
    </>
  );
}

import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PageTransition } from "@/components/motion/page-transition";
import { Resultado } from "@/components/resultado/resultado";

/*
  A tela do plano. O perfil mora no navegador (localStorage), então a página
  só monta a moldura: quem lê o perfil e gera o plano é o <Resultado />, no
  cliente. Nada de gerarPlano aqui. O header fica fora do PageTransition
  (ancorado por vt-header); main e rodapé deslizam com a rota.
*/

export const metadata: Metadata = {
  title: "Seu plano",
  robots: { index: false },
};

export default function ResultadoPage() {
  return (
    <>
      <SiteHeader variant="minimal" />
      <PageTransition>
        <main className="flex-1 py-6 sm:py-10 lg:py-12">
          <Resultado />
        </main>
        <SiteFooter />
      </PageTransition>
    </>
  );
}

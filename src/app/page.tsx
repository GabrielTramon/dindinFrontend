import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Hero } from "@/components/home/hero";
import { ComoFunciona } from "@/components/home/como-funciona";
import { OrdemCerta } from "@/components/home/ordem-certa";
import { NaoFazemos } from "@/components/home/nao-fazemos";
import { Faq } from "@/components/home/faq";
import { CtaFinal } from "@/components/home/cta-final";

export const metadata: Metadata = {
  // absolute: a home não passa pelo template "%s · dindin" do layout
  title: { absolute: "dindin — seu dinheiro com um plano" },
  description:
    "Um plano claro pro seu salário em 2 minutos: o que pagar primeiro, quanto guardar e quanto sobra pra você. Responda 9 perguntas — grátis, sem cadastro e sem lançar gasto todo dia.",
};

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <ComoFunciona />
        <OrdemCerta />
        <NaoFazemos />
        <Faq />
        <CtaFinal />
      </main>
      <SiteFooter />
    </>
  );
}

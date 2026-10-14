import type { Metadata } from "next";
import { CalculadoraJurosCompostos } from "@/components/calculadoras/juros-compostos";
import { CtaLink } from "@/components/layout/cta-link";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { PageTransition } from "@/components/motion/page-transition";

/*
  /calculadoras/juros-compostos — a calculadora aberta, sem conta e sem salvar
  nada. A página monta a moldura e o texto (estáticos, indexáveis: é por aqui
  que muita gente chega pelo buscador); a conta mora no cliente
  (<CalculadoraJurosCompostos />). Termina no convite pro plano.
*/

export const metadata: Metadata = {
  title: "Calculadora de juros compostos",
  description:
    "Simule quanto o seu dinheiro vira com juros compostos: valor inicial, quanto você guarda por mês, a taxa ao mês ou ao ano e o prazo. Veja o valor final, o total investido e os juros, mês a mês. Grátis e sem cadastro.",
  alternates: { canonical: "/calculadoras/juros-compostos" },
};

export default function CalculadoraJurosCompostosPage() {
  return (
    <>
      <SiteHeader />
      <PageTransition>
        <main className="flex-1 py-10 sm:py-16">
          <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 sm:gap-12 sm:px-6">
            <header className="grid max-w-2xl gap-3">
              <p className="eyebrow">Calculadora</p>
              <h1 className="text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">Juros compostos</h1>
              <p className="text-lg text-pretty text-ink-2">
                Quanto o seu dinheiro vira com o tempo, guardando um pouco todo mês. Mude os números à vontade: nada
                aqui é salvo.
              </p>
            </header>

            <CalculadoraJurosCompostos />

            <section aria-labelledby="como-calcula" className="grid max-w-2xl gap-4 border-t pt-10">
              <h2 id="como-calcula" className="text-2xl font-extrabold tracking-tight">
                Como a conta é feita
              </h2>
              <p className="text-ink-2">
                Juros compostos são juros sobre juros: todo mês o rendimento entra no saldo e, a partir daí, também
                rende. Por isso a parte dos juros cresce cada vez mais rápido.
              </p>
              <ul className="grid list-disc gap-2 pl-5 text-ink-2">
                <li>O valor inicial rende desde o primeiro mês; cada depósito mensal entra no fim do mês.</li>
                <li>
                  Taxa ao ano vira a taxa mensal equivalente, não a divisão por 12: 12% ao ano rendem 0,95% ao mês,
                  porque 1% ao mês, composto, já dá 12,68% ao ano.
                </li>
                <li>A conta não desconta imposto, taxas nem inflação: é o crescimento bruto do dinheiro.</li>
              </ul>
            </section>

            <section
              aria-labelledby="calculadora-plano"
              className="grid gap-4 rounded-3xl bg-accent p-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-8"
            >
              <div className="grid gap-1">
                <h2 id="calculadora-plano" className="text-xl font-extrabold tracking-tight">
                  Quanto dá pra guardar por mês?
                </h2>
                <p className="text-ink-2">
                  Responda 9 perguntas e veja o que pagar primeiro, quanto guardar e quanto sobra pra você.
                </p>
              </div>
              <CtaLink href="/plano" transitionTypes={["nav-forward"]}>
                Montar meu plano
              </CtaLink>
            </section>
          </div>
        </main>
        <SiteFooter />
      </PageTransition>
    </>
  );
}

import { CtaLink, ctaClasses } from "@/components/layout/cta-link";
import { ExemploPlano } from "@/components/home/exemplo-plano";
import { Secao } from "@/components/home/secao";
import { Palavras } from "@/components/motion/palavras";
import { staggerStyle } from "@/components/motion/stagger";

/*
  Primeira dobra: proposta em uma frase, o convite e — ao lado — um plano
  de verdade, pra pessoa acreditar antes de clicar. A seção tem a malha de
  luz (bg-mesh); o título entra palavra por palavra e o resto sobe do
  desfoque em cascata (--i de 0 a 4; o card de exemplo entra no tique 2).
*/

const TITULO = "Seu salário, com um plano.";

export function Hero() {
  return (
    <Secao labelledBy="hero-titulo" className="bg-mesh py-14 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div className="flex flex-col items-start">
          <p className="eyebrow rise-in-blur text-primary" style={staggerStyle(0)}>
            Grátis · sem cadastro · 2 minutos
          </p>
          <h1
            id="hero-titulo"
            aria-label={TITULO}
            className="mt-3 text-[2.75rem] leading-[1.02] font-extrabold tracking-tight sm:text-6xl lg:text-7xl"
          >
            <Palavras texto={TITULO} />
          </h1>
          <p
            className="rise-in-blur mt-5 max-w-prose text-lg text-ink-2 sm:text-xl"
            style={staggerStyle(2)}
          >
            Responda 9 perguntas e o dindin te diz o que fazer com o dinheiro este mês: o que
            pagar primeiro, quanto guardar e quanto sobra pra você — sem julgamento e sem lançar
            gasto todo dia.
          </p>
          <div
            className="rise-in-blur mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center"
            style={staggerStyle(3)}
          >
            <CtaLink href="/plano" size="lg" transitionTypes={["nav-forward"]}>
              Montar meu plano
            </CtaLink>
            {/* âncora da mesma página: <a> nativo, não next/link. O Link ignora o
                clique quando o hash já está na URL, e a página não rola de novo. */}
            <a href="#como-funciona" className={ctaClasses("ghost", "lg")}>
              Como funciona
            </a>
          </div>
          <p className="rise-in mt-4 text-sm text-muted-foreground" style={staggerStyle(4)}>
            Sem cadastro. Seu plano fica só no seu navegador.
          </p>
        </div>

        <ExemploPlano />
      </div>
    </Secao>
  );
}

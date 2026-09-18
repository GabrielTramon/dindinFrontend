import { CtaLink } from "@/components/layout/cta-link";
import { ExemploPlano } from "@/components/home/exemplo-plano";
import { Secao } from "@/components/home/secao";

/*
  Primeira dobra: proposta em uma frase, o convite e — ao lado — um plano
  de verdade, pra pessoa acreditar antes de clicar.
*/

export function Hero() {
  return (
    <Secao labelledBy="hero-titulo" className="py-12 sm:py-20">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
        <div className="flex flex-col items-start">
          <p className="text-xs font-bold tracking-wider text-primary uppercase">
            Grátis · sem cadastro · 2 minutos
          </p>
          <h1
            id="hero-titulo"
            className="mt-3 text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-5xl lg:text-6xl"
          >
            Seu salário, com um plano.
          </h1>
          <p className="mt-5 max-w-prose text-lg text-ink-2">
            Responda 9 perguntas e o dindin te diz o que fazer com o dinheiro este mês: o que
            pagar primeiro, quanto guardar e quanto sobra pra você — sem julgamento e sem lançar
            gasto todo dia.
          </p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <CtaLink href="/plano" size="lg">
              Montar meu plano
            </CtaLink>
            <CtaLink href="#como-funciona" variant="ghost" size="lg">
              Como funciona
            </CtaLink>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Sem cadastro. Seus dados ficam só no seu navegador.
          </p>
        </div>

        <ExemploPlano />
      </div>
    </Secao>
  );
}

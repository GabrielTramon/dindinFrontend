import { CtaLink } from "@/components/layout/cta-link";
import { staggerStyle } from "@/components/motion/stagger";

/*
  Sem perfil no navegador: explica o que fazer, sem tom de erro. A mesma
  superfície única da tela do plano (o cartão accent com malha sutil), com
  uma frase grande, uma de apoio e um botão. Nada mais.
*/

export function EstadoVazio() {
  return (
    <div className="mx-auto max-w-xl">
      <section aria-labelledby="vazio-titulo" className="mesh-panel rounded-3xl bg-accent p-6 sm:p-10">
        <p className="eyebrow rise-in">Seu plano</p>
        <h1
          id="vazio-titulo"
          className="rise-in mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl"
          style={staggerStyle(1)}
        >
          Ainda não tem plano por aqui
        </h1>
        <p className="rise-in mt-3 text-base text-ink-2" style={staggerStyle(2)}>
          Responda 9 perguntas e ele aparece na hora: quanto guardar por mês e por quanto tempo. Leva 2 minutos.
        </p>
        <div className="rise-in mt-7" style={staggerStyle(3)}>
          <CtaLink href="/plano" size="lg" transitionTypes={["nav-forward"]} className="w-full sm:w-auto">
            Responder as perguntas
          </CtaLink>
        </div>
      </section>
      <p className="rise-in mt-4 px-1 text-sm text-ink-2" style={staggerStyle(4)}>
        Se você já respondeu em outro navegador ou celular, o plano ficou guardado lá.
      </p>
    </div>
  );
}

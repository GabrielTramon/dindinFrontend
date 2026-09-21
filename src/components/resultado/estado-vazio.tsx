import { CtaLink } from "@/components/layout/cta-link";
import { staggerStyle } from "@/components/motion/stagger";

/*
  Sem perfil no navegador: explica o que fazer, sem tom de erro. Painel com
  luz interna; o título sobe do desfoque e texto e CTA vêm em cascata.
*/

export function EstadoVazio() {
  return (
    <div className="mesh-panel rounded-3xl bg-accent p-7 sm:p-12">
      <h1 className="rise-in-blur text-3xl font-extrabold tracking-tight sm:text-5xl">
        Ainda não tem plano por aqui
      </h1>
      <p className="rise-in mt-3 max-w-prose text-base text-ink-2 sm:text-lg" style={staggerStyle(1)}>
        Responda 9 perguntas e o seu aparece na hora — leva 2 minutos.
      </p>
      <div className="rise-in mt-6" style={staggerStyle(2)}>
        <CtaLink href="/plano" size="lg" transitionTypes={["nav-forward"]}>
          Responder as perguntas
        </CtaLink>
      </div>
    </div>
  );
}

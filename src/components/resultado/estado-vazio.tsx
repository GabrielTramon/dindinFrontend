import { CtaLink } from "@/components/layout/cta-link";

/* Sem perfil no navegador: explica o que fazer, sem tom de erro. */

export function EstadoVazio() {
  return (
    <div className="py-10 sm:py-16">
      <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
        Ainda não tem plano por aqui
      </h1>
      <p className="mt-3 max-w-prose text-base text-ink-2 sm:text-lg">
        Responda 8 perguntas e o seu aparece na hora — leva 2 minutos.
      </p>
      <div className="mt-6">
        <CtaLink href="/plano" size="lg">
          Responder as perguntas
        </CtaLink>
      </div>
    </div>
  );
}

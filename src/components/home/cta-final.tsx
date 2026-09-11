import { CtaLink } from "@/components/layout/cta-link";
import { Secao } from "@/components/home/secao";

/*
  Último convite. Bloco na cor da marca, dentro do container — não full-bleed.
*/

export function CtaFinal() {
  return (
    <Secao labelledBy="cta-final-titulo">
      <div className="rounded-2xl bg-primary p-8 text-primary-foreground sm:p-12">
        <h2 id="cta-final-titulo" className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Dois minutos. Um plano.
        </h2>
        <p className="mt-3 max-w-prose text-lg text-primary-foreground/80">
          Responde agora, vê o resultado na hora e volta quando algo mudar. Sem cadastro, sem
          custo.
        </p>
        <CtaLink
          href="/plano"
          size="lg"
          className="mt-8 bg-card text-primary hover:bg-accent focus-visible:ring-primary-foreground/60"
        >
          Montar meu plano
        </CtaLink>
      </div>
    </Secao>
  );
}

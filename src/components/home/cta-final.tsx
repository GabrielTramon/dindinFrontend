import { CtaLink } from "@/components/layout/cta-link";
import { Secao } from "@/components/home/secao";
import { Reveal } from "@/components/motion/reveal";

/*
  Último convite. Bloco profundo na cor da marca (brand-block, nunca neon nos
  dois temas), dentro do container — não full-bleed. Entra ao rolar e tem uma
  luz interna estática nos cantos (mesh-panel).
*/

export function CtaFinal() {
  return (
    <Secao labelledBy="cta-final-titulo">
      <Reveal className="mesh-panel rounded-3xl bg-brand-block p-8 text-brand-block-foreground sm:p-12">
        <h2 id="cta-final-titulo" className="text-3xl font-extrabold tracking-tight sm:text-5xl">
          Dois minutos. Um plano.
        </h2>
        <p className="mt-3 max-w-prose text-lg text-brand-block-muted">
          Responde agora, vê o resultado na hora e volta quando algo mudar. Sem cadastro, sem
          custo.
        </p>
        <CtaLink
          href="/plano"
          size="lg"
          variant="inverse"
          transitionTypes={["nav-forward"]}
          className="mt-8"
        >
          Montar meu plano
        </CtaLink>
      </Reveal>
    </Secao>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/motion/reveal";

/*
  Bloco de seção da home. Toda seção usa o mesmo container e o mesmo
  respiro vertical — o ritmo da página vem daqui.
  Container padrão do site: mx-auto w-full max-w-5xl px-4 sm:px-6
*/

type SecaoProps = {
  id?: string;
  /** id do heading que dá nome à seção (aria-labelledby) */
  labelledBy: string;
  className?: string;
  children: ReactNode;
};

export function Secao({ id, labelledBy, className, children }: SecaoProps) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn("py-16 sm:py-24", className)}>
      <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">{children}</div>
    </section>
  );
}

type TituloSecaoProps = {
  id: string;
  className?: string;
  children: ReactNode;
};

/* O h2 acende ao entrar na viewport (Reveal); sem JS fica visível desde o início. */
export function TituloSecao({ id, className, children }: TituloSecaoProps) {
  return (
    <Reveal
      as="h2"
      id={id}
      className={cn("text-3xl font-extrabold tracking-tight sm:text-4xl", className)}
    >
      {children}
    </Reveal>
  );
}

import { ViewTransition, type ReactNode } from "react";

/*
  Envelope de página com React <ViewTransition>. Vai em CADA page.tsx (nunca
  no layout, que persiste): <SiteHeader /> fica FORA (ancorado por vt-header),
  <PageTransition> envolve o <main> e o rodapé. Quem decide a direção é o
  link/router: transitionTypes ["nav-forward"] ou ["nav-back"]; sem tipo
  (voltar do navegador) = "none", troca seca. update="none" garante que a
  troca de ?p=N no wizard (mesma rota) não anima nem congela frame.
*/

const TIPOS = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" } as const;

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={TIPOS} exit={TIPOS} update="none" default="none">
      <div className="flex flex-1 flex-col">{children}</div>
    </ViewTransition>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { Onboarding } from "@/components/onboarding/onboarding";
import { OnboardingSkeleton } from "@/components/onboarding/onboarding-skeleton";

/*
  /plano — as 9 perguntas, uma por tela. Sem rodapé do site: o rodapé aqui é
  a barra de navegação do wizard. O Suspense é obrigatório: o Onboarding usa
  useSearchParams e, sem a fronteira, o build estático falha.
*/

export const metadata: Metadata = {
  title: "Montar meu plano",
  robots: { index: false },
};

export default function PlanoPage() {
  return (
    <>
      <SiteHeader variant="minimal" />
      <main className="flex flex-1 flex-col">
        <Suspense fallback={<OnboardingSkeleton />}>
          <Onboarding />
        </Suspense>
      </main>
    </>
  );
}

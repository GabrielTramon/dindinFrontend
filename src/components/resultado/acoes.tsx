"use client";

import { useRouter } from "next/navigation";
import { CtaLink, ctaClasses } from "@/components/layout/cta-link";
import { removeKey, STORAGE_KEYS } from "@/lib/storage";

/*
  Saídas da tela: ajustar uma resposta (volta pro onboarding com o perfil
  preservado) ou apagar tudo e começar de novo.
*/

export function Acoes() {
  const router = useRouter();

  function comecarDoZero() {
    removeKey(STORAGE_KEYS.perfil);
    removeKey(STORAGE_KEYS.rascunho);
    router.push("/plano");
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <CtaLink href="/plano?p=1" variant="secondary">
        Ajustar respostas
      </CtaLink>
      <button type="button" className={ctaClasses("ghost")} onClick={comecarDoZero}>
        Começar do zero
      </button>
    </div>
  );
}

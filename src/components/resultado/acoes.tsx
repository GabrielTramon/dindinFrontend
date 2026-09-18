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
    // os grupos moram numa chave própria: sem esta linha, a organização de
    // quem "começou do zero" reapareceria em cima de um plano novo
    removeKey(STORAGE_KEYS.organizacao);
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

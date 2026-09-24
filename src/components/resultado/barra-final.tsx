"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { BotaoPdf } from "@/components/conta/botao-pdf";
import { CtaLink, ctaClasses } from "@/components/layout/cta-link";
import { NotaLegal } from "@/components/ui/nota-legal";
import type { DadosDoPlanoPdf } from "@/lib/pdf";
import { removeKey, STORAGE_KEYS } from "@/lib/storage";
import { abrirDetalhes } from "./detalhes-plano";

/*
  O fim da leitura: levar (PDF) e ajustar. O aviso educacional fica numa linha
  curta e visível; o texto integral mora nos detalhes ("Entenda").

  "Ajustar respostas" apaga o rascunho antes de navegar: o onboarding reabre a
  partir do perfil salvo, não de um rascunho velho. "Começar do zero" pede
  confirmação na própria linha — apaga perfil, rascunho e potes.
*/

interface BarraFinalProps {
  /** o que o BotaoPdf precisa do plano; a sessão ele mesmo acrescenta */
  entradaPdf: DadosDoPlanoPdf;
}

export function BarraFinal({ entradaPdf }: BarraFinalProps) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState(false);
  const comecarRef = useRef<HTMLButtonElement>(null);

  function comecarDoZero() {
    removeKey(STORAGE_KEYS.perfil);
    removeKey(STORAGE_KEYS.rascunho);
    // os potes moram numa chave própria: sem esta linha, reapareceriam num plano novo
    removeKey(STORAGE_KEYS.organizacao);
    router.push("/plano", { transitionTypes: ["nav-back"] });
  }

  function cancelar() {
    setConfirmando(false);
    requestAnimationFrame(() => comecarRef.current?.focus());
  }

  return (
    <section aria-label="Levar e ajustar" className="space-y-5">
      <div className="[&>*]:w-full sm:[&>*]:w-auto">
        <BotaoPdf entrada={entradaPdf} />
      </div>

      {confirmando ? (
        <div role="group" aria-labelledby="confirmar-zero" className="enter-up space-y-3">
          <p id="confirmar-zero" className="font-bold">
            Apagar respostas e potes deste navegador?
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" autoFocus className={ctaClasses("primary")} onClick={comecarDoZero}>
              Apagar tudo
            </button>
            <button type="button" className={ctaClasses("ghost")} onClick={cancelar}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <CtaLink
            href="/plano?p=1"
            variant="secondary"
            transitionTypes={["nav-back"]}
            onClick={() => removeKey(STORAGE_KEYS.rascunho)}
          >
            Ajustar respostas
          </CtaLink>
          <button
            ref={comecarRef}
            type="button"
            className={ctaClasses("ghost")}
            onClick={() => setConfirmando(true)}
          >
            Começar do zero
          </button>
        </div>
      )}

      <NotaLegal>
        Plano educacional, feito com as suas respostas. Não é recomendação de investimento (Resolução CVM 19).{" "}
        <button
          type="button"
          className="font-bold text-ink-2 underline underline-offset-2 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={() => abrirDetalhes("aviso")}
        >
          Entenda
        </button>
      </NotaLegal>
    </section>
  );
}

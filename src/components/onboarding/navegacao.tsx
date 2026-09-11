import { ctaClasses } from "@/components/layout/cta-link";
import { cn } from "@/lib/utils";

/*
  Rodapé fixo do wizard: Voltar (some no primeiro passo) e Continuar, que só
  libera quando o passo está válido. É o único rodapé do fluxo — sem SiteFooter.
  O botão principal é submit: Enter num input avança pelo mesmo caminho.
*/

interface NavegacaoProps {
  podeVoltar: boolean;
  podeContinuar: boolean;
  ultimo: boolean;
  onVoltar: () => void;
}

export function Navegacao({ podeVoltar, podeContinuar, ultimo, onVoltar }: NavegacaoProps) {
  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
        {podeVoltar && (
          <button type="button" onClick={onVoltar} className={ctaClasses("ghost", "lg")}>
            Voltar
          </button>
        )}
        <button
          type="submit"
          disabled={!podeContinuar}
          className={cn(ctaClasses("primary", "lg"), "ml-auto flex-1 sm:min-w-48 sm:flex-none")}
        >
          {ultimo ? "Ver meu plano" : "Continuar"}
        </button>
      </div>
    </div>
  );
}

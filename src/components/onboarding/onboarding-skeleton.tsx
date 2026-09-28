/*
  Placeholder com a mesma silhueta de um passo: progresso, pergunta, um campo
  grande e chips. Aparece no HTML do servidor e enquanto o rascunho é lido.
  Os blocos usam `skeleton` (trilho bg-track com brilho atravessando) e o
  rodapé tem a MESMA silhueta da Navegacao (vidro, sticky, mesmo padding) pra
  não haver salto quando o formulário assenta por cima (enter-up).
*/

export function OnboardingSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <p role="status" className="sr-only">
        Preparando as perguntas
      </p>

      <div aria-hidden="true" className="mx-auto w-full max-w-lg flex-1 px-4 pt-[5vh] pb-12 sm:px-6">
        <div className="grid gap-8">
          <div className="grid gap-2.5">
            <div className="skeleton h-3 w-28 rounded-full" />
            <div className="skeleton h-1.5 w-full rounded-full" />
          </div>

          <div className="grid gap-3">
            <div className="skeleton h-9 w-5/6 rounded-lg sm:h-10" />
            <div className="skeleton h-9 w-3/5 rounded-lg sm:h-10" />
            <div className="skeleton h-5 w-4/5 rounded-lg" />
          </div>

          <div className="grid gap-5">
            <div className="skeleton h-16 w-full rounded-2xl" />
            <div className="flex flex-wrap gap-2">
              <div className="skeleton h-11 w-20 rounded-full" />
              <div className="skeleton h-11 w-20 rounded-full" />
              <div className="skeleton h-11 w-20 rounded-full" />
              <div className="skeleton h-11 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="glass sticky bottom-0 z-10 border-t border-glass-border">
        <div className="mx-auto flex w-full max-w-lg items-center gap-3 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          <div className="skeleton h-12 w-full rounded-full sm:ml-auto sm:h-13 sm:w-48" />
        </div>
      </div>
    </div>
  );
}

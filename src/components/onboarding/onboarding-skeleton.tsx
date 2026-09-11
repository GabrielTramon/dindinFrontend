/*
  Placeholder com a mesma silhueta de um passo: progresso, pergunta, um campo
  grande e chips. Aparece no HTML do servidor e enquanto o rascunho é lido.
*/

export function OnboardingSkeleton() {
  return (
    <div className="flex flex-1 flex-col">
      <p role="status" className="sr-only">
        Preparando as perguntas
      </p>

      <div aria-hidden="true" className="mx-auto w-full max-w-lg flex-1 px-4 pt-[5vh] pb-12 sm:px-6">
        <div className="grid animate-pulse gap-8 motion-reduce:animate-none">
          <div className="grid gap-2.5">
            <div className="h-3 w-28 rounded-full bg-muted" />
            <div className="h-1.5 w-full rounded-full bg-muted" />
          </div>

          <div className="grid gap-3">
            <div className="h-8 w-5/6 rounded-lg bg-muted" />
            <div className="h-8 w-3/5 rounded-lg bg-muted" />
            <div className="h-5 w-4/5 rounded-lg bg-muted" />
          </div>

          <div className="grid gap-5">
            <div className="h-16 w-full rounded-2xl bg-muted" />
            <div className="flex flex-wrap gap-2">
              <div className="h-11 w-20 rounded-full bg-muted" />
              <div className="h-11 w-20 rounded-full bg-muted" />
              <div className="h-11 w-20 rounded-full bg-muted" />
              <div className="h-11 w-20 rounded-full bg-muted" />
            </div>
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="border-t border-border">
        <div className="mx-auto flex w-full max-w-lg px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
          <div className="h-12 w-full rounded-full bg-muted sm:ml-auto sm:w-48" />
        </div>
      </div>
    </div>
  );
}

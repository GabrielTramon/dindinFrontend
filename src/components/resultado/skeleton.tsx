/*
  Silhueta do plano enquanto o perfil é lido do navegador. Mesmas alturas
  das seções de cima pra página não pular quando o conteúdo chega.
*/

const DEGRAUS = [0, 1, 2, 3, 4];
const NUMEROS = [0, 1, 2];

export function Skeleton() {
  return (
    <div role="status" aria-busy="true" className="animate-pulse space-y-10 sm:space-y-14">
      <span className="sr-only">Carregando seu plano</span>

      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-3 w-40 rounded-full bg-muted" />
        <div className="h-7 w-28 rounded-full bg-muted" />
      </div>

      <div className="rounded-2xl bg-muted p-6 sm:p-8">
        <div className="h-8 w-4/5 rounded-lg bg-background/70 sm:h-10" />
        <div className="mt-3 h-8 w-3/5 rounded-lg bg-background/70 sm:h-10" />
        <div className="mt-5 h-4 w-full rounded-full bg-background/70" />
        <div className="mt-2 h-4 w-5/6 rounded-full bg-background/70" />
      </div>

      <div className="flex gap-2 overflow-hidden">
        {DEGRAUS.map((d) => (
          <div key={d} className="h-9 w-32 shrink-0 rounded-full bg-muted" />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        {NUMEROS.map((n) => (
          <div key={n}>
            <div className="h-3 w-14 rounded-full bg-muted" />
            <div className="mt-2 h-7 w-24 rounded-lg bg-muted sm:h-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

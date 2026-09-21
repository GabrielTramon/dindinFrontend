/*
  Silhueta do plano enquanto o perfil é lido do navegador. Mesmas alturas
  das seções de cima pra página não pular quando o conteúdo chega. Os blocos
  têm o trilho (bg-track) com um brilho atravessando (skeleton); em
  reduced-motion ficam parados.
*/

const DEGRAUS = [0, 1, 2, 3, 4];
const NUMEROS = [0, 1, 2];

export function Skeleton() {
  return (
    <div role="status" aria-busy="true" className="space-y-10 sm:space-y-14">
      <span className="sr-only">Carregando seu plano</span>

      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="skeleton h-3 w-40 rounded-full" />
        <div className="skeleton h-7 w-28 rounded-full" />
      </div>

      <div className="rounded-3xl border bg-card p-6 sm:p-8">
        <div className="skeleton h-8 w-4/5 rounded-lg sm:h-10" />
        <div className="skeleton mt-3 h-8 w-3/5 rounded-lg sm:h-10" />
        <div className="skeleton mt-5 h-4 w-full rounded-full" />
        <div className="skeleton mt-2 h-4 w-5/6 rounded-full" />
      </div>

      <div className="flex gap-2 overflow-hidden">
        {DEGRAUS.map((d) => (
          <div key={d} className="skeleton h-9 w-32 shrink-0 rounded-full" />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        {NUMEROS.map((n) => (
          <div key={n}>
            <div className="skeleton h-3 w-14 rounded-full" />
            <div className="skeleton mt-2 h-7 w-24 rounded-lg sm:h-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

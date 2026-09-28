/*
  A silhueta da tela nova enquanto o perfil é lido do navegador: o cartão da
  resposta (com o número grande e os 3 ritmos), as linhas do caminho, a barra
  do divisor e duas linhas de pote. Mesmas alturas e o mesmo desenho de
  colunas, pra página não pular quando o plano chega. Os blocos são o trilho
  (bg-track) com um brilho atravessando; em reduced-motion ficam parados.
*/

const MARCOS = [0, 1, 2];
const RITMOS = [0, 1, 2];
const POTES = [0, 1];

export function Skeleton() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="space-y-10 sm:space-y-16 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start lg:gap-14 lg:space-y-0"
    >
      <span className="sr-only">Carregando seu plano</span>

      <div className="space-y-10">
        <div className="rounded-3xl bg-accent p-5 sm:p-8">
          <div className="skeleton h-3 w-44 rounded-full" />
          <div className="skeleton mt-3 h-6 w-3/5 rounded-lg" />
          <div className="skeleton mt-5 h-12 w-48 rounded-xl sm:h-14" />
          <div className="skeleton mt-2 h-4 w-32 rounded-full" />
          <div className="skeleton mt-4 h-5 w-4/5 rounded-full" />
          <div className="skeleton mt-4 h-4 w-3/5 rounded-full" />
          <div className="skeleton mt-7 h-3 w-40 rounded-full" />
          <div className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-background/70 p-1">
            {RITMOS.map((r) => (
              <div key={r} className="skeleton h-14 rounded-xl" />
            ))}
          </div>
        </div>

        <div>
          <div className="skeleton h-3 w-24 rounded-full" />
          <div className="mt-4 space-y-4">
            {MARCOS.map((m) => (
              <div key={m} className="flex items-center gap-3">
                <div className="skeleton size-2.5 rounded-full" />
                <div className="skeleton h-4 w-16 rounded-full" />
                <div className="skeleton h-4 flex-1 rounded-full" />
                <div className="skeleton h-4 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="skeleton h-4 w-36 rounded-full" />
        <div className="skeleton mt-3 h-4 w-11/12 rounded-full" />
        <div className="skeleton mt-5 h-3 w-full rounded-full" />
        <div className="mt-4 divide-y">
          {POTES.map((p) => (
            <div key={p} className="flex items-center gap-3 py-4">
              <div className="skeleton size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-24 rounded-full" />
                <div className="skeleton h-3 w-36 rounded-full" />
              </div>
              <div className="skeleton h-11 w-32 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

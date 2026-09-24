import { staggerStyle } from "@/components/motion/stagger";
import { CheckDraw } from "@/components/ui/drawn-icon";
import type { Marco } from "@/domain";
import { formatMeses } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
  "Seu caminho": o "por quanto tempo" do plano inteiro, numa lista vertical
  curta (nada de rolagem horizontal). Uma linha por marco — prazo, o que
  acontece, o mês — alinhadas em colunas (subgrid). O marco de agora tem o
  ponto cheio; os próximos, só o contorno; os feitos, um check.

  Só aparece com 2 marcos ou mais: um só já está dito no cartão de cima.
*/

/** "3 meses", "27 meses"; acima de 3 anos, em anos ("4 anos e 2 meses") */
function prazoCurto(meses: number): string {
  if (meses <= 36) return meses === 1 ? "1 mês" : `${meses} meses`;
  return formatMeses(meses);
}

export function Caminho({ marcos }: { marcos: Marco[] }) {
  if (marcos.length < 2) return null;

  return (
    <section aria-labelledby="caminho-titulo">
      <h2 id="caminho-titulo" className="eyebrow">
        Seu caminho
      </h2>
      {/* o fio que liga os pontos é decorativo: um ::before, pra lista só ter <li> */}
      <ol className="relative mt-3 grid grid-cols-[1rem_auto_minmax(0,1fr)_auto] gap-x-3 before:absolute before:top-5 before:bottom-5 before:left-1.75 before:w-px before:bg-border before:content-['']">
        {marcos.map((marco, i) => (
          <li
            key={marco.id}
            aria-current={marco.estado === "atual" ? "step" : undefined}
            style={staggerStyle(i)}
            className={cn(
              "rise-in col-span-4 grid grid-cols-subgrid items-baseline py-2",
              marco.estado === "atual" ? "text-foreground" : "text-ink-2",
            )}
          >
            <span aria-hidden="true" className="relative flex h-full items-center justify-center self-center">
              {marco.estado === "feito" ? (
                <span className="flex size-4 items-center justify-center rounded-full bg-background">
                  <CheckDraw className="size-4 text-primary" delay={200} />
                </span>
              ) : (
                <span
                  className={cn(
                    "size-2.5 rounded-full",
                    marco.estado === "atual"
                      ? "step-light bg-primary ring-4 ring-primary/20"
                      : "border-2 border-ink-3 bg-background",
                  )}
                />
              )}
            </span>
            <span className="text-sm font-bold tnum whitespace-nowrap">
              <Prazo marco={marco} />
            </span>
            <span className={cn("min-w-0 text-sm", marco.estado === "atual" && "font-bold")}>
              {marco.estado === "feito" && <span className="sr-only">Feito: </span>}
              {marco.rotulo}
            </span>
            <span className="text-right text-sm text-ink-2 tnum whitespace-nowrap">
              {marco.mes ?? (marco.semPrazo ? "nesse ritmo" : "")}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Prazo({ marco }: { marco: Marco }) {
  // o check e o rótulo ("Fôlego pronto") já dizem que está feito
  if (marco.estado === "feito") return null;
  if (marco.meses !== null) return <>{prazoCurto(marco.meses)}</>;
  if (marco.semPrazo) return <span className="text-ink-2">sem prazo</span>;
  return <span className="font-normal text-ink-3">depois</span>;
}

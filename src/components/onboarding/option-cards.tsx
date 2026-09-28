import { staggerStyle } from "@/components/motion/stagger";
import { CheckDraw } from "@/components/ui/drawn-icon";
import { cn } from "@/lib/utils";

/*
  Grupo de cards com semântica de radio nativo: o input fica invisível (sr-only)
  e o label é o card. Setas do teclado, foco e leitor de tela vêm de graça.

  Os cards entram em cascata (rise-in + --i), têm press físico e a sombra
  esmeralda do glow-card. O selecionado (data-checked no label, espelho do
  radio) ganha fundo accent, sombra maior e o círculo à direita vira esmeralda
  com um Check que se desenha. O indicador é um span real (aria-hidden).
*/

interface OptionCardsOption<T extends string> {
  value: T;
  titulo: string;
  descricao?: string;
}

interface OptionCardsProps<T extends string> {
  /** nome do grupo de radios; também prefixa os ids */
  name: string;
  /** legenda do fieldset (a pergunta), visível só pro leitor de tela */
  legend: string;
  options: readonly OptionCardsOption<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  describedBy?: string;
  className?: string;
}

export function OptionCards<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  describedBy,
  className,
}: OptionCardsProps<T>) {
  return (
    <fieldset aria-describedby={describedBy} className={cn("grid min-w-0 gap-3", className)}>
      <legend className="sr-only">{legend}</legend>
      {options.map((o, i) => {
        const id = `${name}-${o.value}`;
        const checked = value === o.value;
        return (
          <div key={o.value} className="rise-in" style={staggerStyle(i)}>
            <input
              type="radio"
              id={id}
              name={name}
              value={o.value}
              checked={checked}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <label
              htmlFor={id}
              data-checked={checked || undefined}
              className="group press glow-card relative flex min-h-14 cursor-pointer flex-col justify-center gap-0.5 rounded-2xl border border-border bg-card py-3.5 pr-14 pl-4 select-none data-checked:border-primary data-checked:bg-accent data-checked:shadow-card-hover peer-focus-visible:ring-3 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background"
            >
              <span className="font-bold leading-snug text-foreground">{o.titulo}</span>
              {o.descricao && <span className="text-sm text-ink-2">{o.descricao}</span>}
              <span
                aria-hidden="true"
                className="absolute top-1/2 right-4 flex size-6 -translate-y-1/2 items-center justify-center rounded-full border border-input bg-card text-primary-foreground transition-[background-color,border-color,scale] duration-(--duration-base) ease-spring group-data-checked:border-primary group-data-checked:bg-primary group-data-checked:scale-110 motion-reduce:transition-none"
              >
                {checked && <CheckDraw className="size-3.5" />}
              </span>
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}

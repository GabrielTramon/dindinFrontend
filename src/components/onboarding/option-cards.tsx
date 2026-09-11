import { cn } from "@/lib/utils";

/*
  Grupo de cards com semântica de radio nativo: o input fica invisível (sr-only)
  e o label é o card. Setas do teclado, foco e leitor de tela vêm de graça.
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
      {options.map((o) => {
        const id = `${name}-${o.value}`;
        return (
          <div key={o.value}>
            <input
              type="radio"
              id={id}
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <label
              htmlFor={id}
              className="flex min-h-14 cursor-pointer flex-col justify-center gap-0.5 rounded-2xl border border-border bg-card px-4 py-3.5 transition-colors select-none hover:border-ink-3 peer-checked:border-primary peer-checked:bg-accent peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 motion-reduce:transition-none"
            >
              <span className="font-bold leading-snug text-foreground">{o.titulo}</span>
              {o.descricao && <span className="text-sm text-ink-2">{o.descricao}</span>}
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}

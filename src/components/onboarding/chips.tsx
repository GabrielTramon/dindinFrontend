import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
  Pílulas de escolha rápida. Seleção única; o selecionado fica esmeralda.
  `Chips` são botões com estado: atalhos que preenchem um campo (`ChipsValor`
  formata reais). `ChipsRadio` é a mesma pílula com semântica de radio nativo,
  pra quando a escolha é a própria resposta (tipo de dívida): setas trocam a
  opção e o grupo é uma parada só no Tab.
*/

const PILULA =
  "inline-flex h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-bold text-ink-2 transition-colors outline-none select-none tnum hover:border-ink-3 hover:text-foreground motion-reduce:transition-none";

interface ChipOption<T> {
  value: T;
  label: string;
}

interface ChipsProps<T extends string | number> {
  options: readonly ChipOption<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  /** nome do grupo pro leitor de tela */
  label: string;
  className?: string;
}

export function Chips<T extends string | number>({ options, value, onChange, label, className }: ChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const selecionado = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={selecionado}
            onClick={() => onChange(o.value)}
            className={cn(
              PILULA,
              "focus-visible:ring-3 focus-visible:ring-ring/50",
              selecionado &&
                "border-primary bg-primary text-primary-foreground hover:border-primary hover:text-primary-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

interface ChipsRadioProps<T extends string> {
  /** nome do grupo de radios; também prefixa os ids */
  name: string;
  options: readonly ChipOption<T>[];
  value: T | undefined;
  onChange: (v: T) => void;
  /** nome do grupo pro leitor de tela */
  label: string;
  className?: string;
}

export function ChipsRadio<T extends string>({
  name,
  options,
  value,
  onChange,
  label,
  className,
}: ChipsRadioProps<T>) {
  return (
    <fieldset className={cn("flex flex-wrap gap-2", className)}>
      <legend className="sr-only">{label}</legend>
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
              className={cn(
                PILULA,
                "cursor-pointer peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:hover:border-primary peer-checked:hover:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
              )}
            >
              {o.label}
            </label>
          </div>
        );
      })}
    </fieldset>
  );
}

interface ChipsValorProps {
  valores: readonly number[];
  value: number | undefined;
  onChange: (n: number) => void;
  label?: string;
}

/** Atalhos de valor em reais. */
export function ChipsValor({ valores, value, onChange, label = "Atalhos de valor" }: ChipsValorProps) {
  return (
    <Chips
      options={valores.map((v) => ({ value: v, label: formatBRL(v) }))}
      value={value}
      onChange={onChange}
      label={label}
    />
  );
}

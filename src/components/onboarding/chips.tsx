import { formatBRL } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
  Pílulas de escolha rápida. Seleção única; a selecionada preenche em esmeralda
  com glow e dá um pop; hover escurece a borda; press físico (a transição é do
  `press`). `Chips` são botões com estado: atalhos que preenchem um campo
  (`ChipsValor` formata reais). `ChipsRadio` é a mesma pílula com semântica de
  radio nativo, pra quando a escolha é a própria resposta (tipo de dívida):
  setas trocam a opção e o grupo é uma parada só no Tab.
*/

const PILULA =
  "press inline-flex h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-bold text-ink-2 outline-none select-none tnum hover:border-border-strong hover:text-foreground";

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
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            PILULA,
            "focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground aria-pressed:shadow-cta aria-pressed:hover:border-primary aria-pressed:hover:text-primary-foreground motion-safe:aria-pressed:animate-pop",
          )}
        >
          {o.label}
        </button>
      ))}
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
  /** o erro do passo aponta pra esta escolha (ex.: "escolha o tipo da dívida") */
  invalid?: boolean;
  /** id da mensagem de erro que descreve o grupo */
  describedBy?: string;
  className?: string;
}

export function ChipsRadio<T extends string>({
  name,
  options,
  value,
  onChange,
  label,
  invalid,
  describedBy,
  className,
}: ChipsRadioProps<T>) {
  // radiogroup e não fieldset: é o papel que aceita aria-invalid, e o leitor de tela lê um grupo só
  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={cn("flex flex-wrap gap-2", className)}
    >
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
                "cursor-pointer peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground peer-checked:shadow-cta peer-checked:hover:border-primary peer-checked:hover:text-primary-foreground peer-focus-visible:ring-3 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
              )}
            >
              {o.label}
            </label>
          </div>
        );
      })}
    </div>
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

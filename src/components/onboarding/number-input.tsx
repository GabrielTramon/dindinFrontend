import { cn } from "@/lib/utils";

/*
  Campo numérico grande, do tamanho da pergunta. Só dígitos entram; quem decide
  como mostrar e como ler o texto é quem usa (reais, anos…). Sem estado
  interno: o texto é derivado do valor, então chips e slider nunca desalinham.
*/

interface NumberInputProps {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  /** texto digitado → número; undefined quando vazio */
  parse: (text: string) => number | undefined;
  /** número → texto mostrado */
  format: (n: number) => string;
  prefix?: string;
  suffix?: string;
  placeholder?: string;
  autoFocus?: boolean;
  /** esconde o rótulo visualmente (quando a pergunta já é o h1) */
  hideLabel?: boolean;
  describedBy?: string;
  invalid?: boolean;
  size?: "lg" | "md";
  className?: string;
}

export function NumberInput({
  id,
  label,
  value,
  onChange,
  parse,
  format,
  prefix,
  suffix,
  placeholder,
  autoFocus,
  hideLabel,
  describedBy,
  invalid,
  size = "lg",
  className,
}: NumberInputProps) {
  const texto = value === undefined ? "" : format(value);

  return (
    <div className={cn("grid min-w-0 gap-2", className)}>
      <label
        htmlFor={id}
        className={
          hideLabel ? "sr-only" : "text-xs font-bold tracking-wider text-muted-foreground uppercase"
        }
      >
        {label}
      </label>
      <div
        className={cn(
          // min-w-0 aqui e w-0 no input: sem isso a largura intrínseca do input (20 caracteres em text-3xl) estoura o grid no mobile
          "flex min-w-0 items-center gap-2 rounded-2xl border border-input bg-card px-5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-aria-invalid:border-warn has-aria-invalid:focus-within:ring-warn/30 motion-reduce:transition-none",
          size === "lg" ? "h-16" : "h-14",
        )}
      >
        {prefix && (
          <span aria-hidden="true" className="text-xl font-bold text-ink-3">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          value={texto}
          placeholder={placeholder}
          onChange={(e) => onChange(parse(e.target.value))}
          aria-describedby={describedBy}
          aria-invalid={invalid ? true : undefined}
          className={cn(
            "w-0 min-w-0 flex-1 bg-transparent font-extrabold tracking-tight text-foreground outline-none tnum placeholder:text-ink-3/50",
            size === "lg" ? "text-3xl" : "text-2xl",
          )}
        />
        {suffix && (
          <span aria-hidden="true" className="text-base font-bold text-ink-3">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

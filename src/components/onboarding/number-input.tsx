"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/*
  Campo numérico grande, do tamanho da pergunta. Só dígitos entram; quem decide
  como mostrar e como ler o texto é quem usa (reais, anos…). Sem estado
  interno: o texto é derivado do valor, então chips e slider nunca desalinham.

  Tamanhos: lg/md têm caixa própria (borda, anel de foco); sm é nu — quem dá
  o foco é a linha que o contém. `flashKey`: mude o número e a caixa pisca um
  anel esmeralda que se dissolve (ao tocar num chip), sem estado React.
  Campo de texto NÃO usa `press`: transiciona só borda e sombra.
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
  size?: "lg" | "md" | "sm";
  /** incremente pra caixa piscar o anel (data-flash → animate-field-flash) */
  flashKey?: number;
  className?: string;
}

const CAIXA = {
  lg: "h-16 rounded-2xl border border-input bg-card px-5",
  md: "h-14 rounded-2xl border border-input bg-card px-5",
  sm: "h-11 gap-1 px-0",
} as const;

const COM_CAIXA =
  "transition-[border-color,box-shadow] duration-(--duration-base) ease-out-expo focus-within:border-ring focus-within:ring-3 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background has-aria-invalid:border-warn has-aria-invalid:focus-within:ring-warn motion-reduce:transition-none data-flash:animate-field-flash";

const CAMPO = { lg: "text-3xl", md: "text-2xl", sm: "text-xl text-right" } as const;

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
  flashKey,
  className,
}: NumberInputProps) {
  const texto = value === undefined ? "" : format(value);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!flashKey) return;
    const el = caixa.current;
    if (!el) return;
    // remover e repor o atributo reinicia a animação; ler offsetWidth força o reflow entre os dois
    el.removeAttribute("data-flash");
    void el.offsetWidth;
    el.setAttribute("data-flash", "");
    const fim = () => el.removeAttribute("data-flash");
    el.addEventListener("animationend", fim, { once: true });
    return () => el.removeEventListener("animationend", fim);
  }, [flashKey]);

  return (
    <div className={cn("grid min-w-0 gap-2", className)}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "eyebrow"}>
        {label}
      </label>
      <div
        ref={caixa}
        className={cn(
          // min-w-0 aqui e w-0 no input: sem isso a largura intrínseca do input (20 caracteres em text-3xl) estoura o grid no mobile
          "flex min-w-0 items-center gap-2",
          CAIXA[size],
          size !== "sm" && COM_CAIXA,
        )}
      >
        {prefix && (
          <span aria-hidden="true" className={cn("font-bold text-ink-2", size === "sm" ? "text-base" : "text-xl")}>
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
            "w-0 min-w-0 flex-1 bg-transparent font-extrabold tracking-tight text-foreground outline-none tnum placeholder:text-ink-3",
            CAMPO[size],
          )}
        />
        {suffix && (
          <span aria-hidden="true" className="text-base font-bold text-ink-2">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

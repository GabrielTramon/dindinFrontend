import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/*
  Campo de texto com a caixa do NumberInput (md) ou nu, só com a linha de
  baixo (sm). Campo de texto NÃO usa `press` (o :active escalaria o campo):
  transiciona só borda e sombra.
*/

type Props = Omit<ComponentProps<"input">, "size"> & {
  id: string;
  label: string;
  hideLabel?: boolean;
  size?: "md" | "sm";
  suffix?: string;
  className?: string;
};

export function TextField({ id, label, hideLabel, size = "md", suffix, className, ...input }: Props) {
  return (
    <div className={cn("grid min-w-0 gap-2", className)}>
      <label htmlFor={id} className={hideLabel ? "sr-only" : "eyebrow"}>
        {label}
      </label>
      <div
        className={cn(
          "flex min-w-0 items-center gap-2 transition-[border-color,box-shadow] duration-(--duration-base) ease-out-expo motion-reduce:transition-none",
          size === "md"
            ? "h-14 rounded-2xl border border-input bg-card px-5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
            : "h-11 border-b border-input px-0 focus-within:border-ring",
        )}
      >
        <input
          id={id}
          type="text"
          autoComplete="off"
          className={cn(
            "w-0 min-w-0 flex-1 bg-transparent font-bold text-foreground outline-none placeholder:font-normal placeholder:text-ink-3",
            size === "md" ? "text-lg" : "text-base",
          )}
          {...input}
        />
        {suffix && (
          <span aria-hidden="true" className="shrink-0 text-sm font-bold text-ink-2">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

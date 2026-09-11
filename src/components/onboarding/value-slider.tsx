import { Slider } from "@/components/ui/slider";

/*
  Slider de um valor só, com o polegar do tamanho de um dedo. O valor de
  verdade mora no input ao lado; aqui ele é só limitado à faixa do trilho.
*/

interface ValueSliderProps {
  value: number | undefined;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  /** id do elemento que dá nome ao slider (a pergunta) */
  labelledBy: string;
  /** como o leitor de tela fala o valor (ex.: moeda) */
  format?: Intl.NumberFormatOptions;
}

export function ValueSlider({ value, onChange, min, max, step = 1, labelledBy, format }: ValueSliderProps) {
  const atual = Math.min(max, Math.max(min, value ?? min));

  return (
    <Slider
      value={[atual]}
      onValueChange={(v) => onChange(typeof v === "number" ? v : v[0])}
      min={min}
      max={max}
      step={step}
      locale="pt-BR"
      format={format}
      aria-labelledby={labelledBy}
      className="py-3 **:data-[slot=slider-track]:h-1.5 **:data-[slot=slider-track]:bg-border **:data-[slot=slider-thumb]:size-6 **:data-[slot=slider-thumb]:border-2 **:data-[slot=slider-thumb]:border-primary **:data-[slot=slider-thumb]:after:-inset-3"
    />
  );
}

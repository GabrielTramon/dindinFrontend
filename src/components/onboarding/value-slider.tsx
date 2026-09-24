import { Slider as SliderPrimitive } from "@base-ui/react/slider";

/*
  Slider de um valor só, com o polegar do tamanho de um dedo (trilho bg-track,
  polegar 24px com glow — o mesmo visual de ui/slider). O valor de verdade mora
  no input ao lado; aqui ele é só limitado à faixa do trilho.

  Monta o primitivo direto, e não o ui/slider, por causa do polegar: sem
  resposta, ele fica no começo do trilho, mas o leitor de tela precisa ouvir
  "sem resposta" — e não o mínimo, como se a pessoa tivesse respondido. Quem
  fala isso é o `getAriaValueText` do polegar, que o ui/slider não repassa.
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

const SEM_RESPOSTA = () => "Sem resposta";

export function ValueSlider({ value, onChange, min, max, step = 1, labelledBy, format }: ValueSliderProps) {
  const atual = Math.min(max, Math.max(min, value ?? min));

  return (
    <SliderPrimitive.Root
      value={[atual]}
      onValueChange={(v) => onChange(typeof v === "number" ? v : v[0])}
      min={min}
      max={max}
      step={step}
      locale="pt-BR"
      format={format}
      thumbAlignment="edge"
      aria-labelledby={labelledBy}
      data-slot="slider"
      className="py-3 data-horizontal:w-full"
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-track select-none data-horizontal:h-1.5 data-horizontal:w-full"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary shadow-glow select-none data-horizontal:h-full"
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          getAriaValueText={value === undefined ? SEM_RESPOSTA : undefined}
          className="relative block size-6 shrink-0 rounded-full border-2 border-primary bg-card shadow-cta transition-[scale,box-shadow] duration-(--duration-fast) ease-spring select-none after:absolute after:-inset-3 hover:scale-110 active:scale-125 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-hidden motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50"
        />
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

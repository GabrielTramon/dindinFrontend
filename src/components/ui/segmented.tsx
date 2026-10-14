import { cn } from "@/lib/utils";

/*
  Controle segmentado: as opções numa pílula só, a marcada preenchida em
  esmeralda. É pra UNIDADE de um campo (ao mês | ao ano, meses | anos) ou a
  visão de uma tabela, sempre do menor pro maior (mês antes de ano); pra uma
  resposta do plano, os ChipsRadio.

  Radio nativo por baixo: as setas trocam a opção, o grupo é uma parada só no
  Tab e o leitor de tela lê "1 de 2". O anel de foco é do grupo inteiro: quem
  tem o foco é sempre a opção marcada.

  Os segmentos têm a mesma largura e a marca é uma pílula só, que desliza até a
  opção marcada (translate em CSS: fora de /plano não existe motion; em
  reduced-motion ela só troca). A caixa tem a borda dos campos. `md` tem a
  altura deles (56px), pra ficar na mesma linha; `sm`, 48px. Nos dois, cada
  opção tem pelo menos 44px de alvo.
*/

interface Opcao<T> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  /** nome do grupo de radios; também prefixa os ids */
  name: string;
  /** nome do grupo pro leitor de tela */
  label: string;
  options: readonly Opcao<T>[];
  value: T;
  onChange: (v: T) => void;
  size?: "md" | "sm";
  className?: string;
}

const ALTURA = { md: "h-14", sm: "h-12" } as const;

export function Segmented<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
  size = "md",
  className,
}: SegmentedProps<T>) {
  const marcada = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative isolate grid min-w-0 shrink-0 auto-cols-fr grid-flow-col rounded-full border border-input bg-card px-1",
        "has-focus-visible:ring-3 has-focus-visible:ring-ring has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-background",
        ALTURA[size],
        className,
      )}
    >
      {/* a marca: do tamanho de um segmento (a caixa menos o respiro, dividida pelas opções) */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 -z-10 rounded-full bg-primary transition-[translate] duration-(--duration-base) ease-out-expo motion-reduce:transition-none"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, translate: `${marcada * 100}% 0` }}
      />
      {options.map((o) => {
        const id = `${name}-${o.value}`;
        return (
          <div key={o.value} className="flex min-w-0">
            <input
              type="radio"
              id={id}
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <label
              htmlFor={id}
              className="flex min-w-0 flex-1 cursor-pointer items-center justify-center px-4 text-sm font-bold whitespace-nowrap text-ink-2 transition-colors duration-(--duration-base) select-none hover:text-foreground peer-checked:text-primary-foreground motion-reduce:transition-none"
            >
              {o.label}
            </label>
          </div>
        );
      })}
    </div>
  );
}

import { cn } from "@/lib/utils";

/*
  Marca do dindin: um "d" minúsculo cujo ascendente sobe em degraus — a cascata
  de prioridades do plano. Geometria simples pra ler bem em 32px.
  Usa currentColor: controle a cor pelo `text-*` do container.
*/

type LogoMarkProps = {
  className?: string;
  title?: string;
};

export function LogoMark({ className, title = "dindin" }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={title}
      className={cn("size-8 shrink-0", className)}
      fill="currentColor"
    >
      <title>{title}</title>
      {/* haste */}
      <rect x="58" y="6" width="17" height="90" rx="2" />
      {/* degraus subindo até a haste */}
      <path d="M58 16 H45 V26 H34 V36 H23 V48 H58 Z" />
      {/* bojo do d */}
      <path
        fillRule="evenodd"
        d="M42 96 C22.7 96 8 81.3 8 62 C8 42.7 22.7 28 42 28 L75 28 L75 96 Z
           M41 79 C50.9 79 58 71.9 58 62 C58 52.1 50.9 45 41 45 C31.1 45 24 52.1 24 62 C24 71.9 31.1 79 41 79 Z"
      />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  markClassName?: string;
  wordClassName?: string;
};

export function Logo({ className, markClassName, wordClassName }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-primary", className)}>
      <LogoMark className={markClassName} />
      <span
        className={cn(
          "font-heading text-[1.35rem] font-extrabold leading-none tracking-[-0.03em]",
          wordClassName,
        )}
        aria-hidden="true"
      >
        dindin
      </span>
    </span>
  );
}

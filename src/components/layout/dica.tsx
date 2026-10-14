import type { ReactNode } from "react";

/*
  A dica de um botão-ícone do cabeçalho: uma pílula escura embaixo do ícone,
  no hover (com 300ms de espera, pra não piscar ao passar o mouse) e no foco
  pelo teclado. Só a partir de 768px: no celular não existe hover.
  Visual apenas (aria-hidden): o nome acessível é o aria-label do botão, que
  precisa estar dentro de um `group relative` (o ICONE_DO_HEADER já é).
*/

export function Dica({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute top-full left-1/2 z-10 mt-1.5 hidden -translate-x-1/2 scale-95 rounded-lg bg-foreground px-2.5 py-1 text-xs font-bold whitespace-nowrap text-background opacity-0 shadow-card transition-[opacity,scale] duration-(--duration-base) ease-out-expo group-hover:scale-100 group-hover:opacity-100 group-hover:delay-300 group-focus-visible:scale-100 group-focus-visible:opacity-100 motion-reduce:transition-none md:block"
    >
      {children}
    </span>
  );
}

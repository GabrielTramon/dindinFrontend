/*
  As classes dos itens do cabeçalho, numa fonte só: os links de página (no
  header e na linha do desktop) e os botões-ícone (tema, conta, menu).
*/

/** link de página: texto com o traço esmeralda que cresce da esquerda no hover; na página atual, o traço fica */
export const LINK_DO_HEADER =
  "press relative inline-flex min-h-11 items-center rounded-full px-3 text-sm font-bold whitespace-nowrap text-ink-2 outline-none after:absolute after:inset-x-3 after:bottom-2.5 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-primary after:transition-[scale] after:duration-(--duration-base) after:ease-out-expo hover:text-foreground hover:after:scale-x-100 focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-[current=page]:text-foreground aria-[current=page]:after:scale-x-100 motion-reduce:after:transition-none";

/** botão-ícone redondo de 44px (o alvo de toque), sem texto visível: o nome vai no aria-label e na Dica */
export const ICONE_DO_HEADER =
  "group press relative inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-[current=page]:bg-accent aria-[current=page]:text-foreground";

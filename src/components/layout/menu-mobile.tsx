"use client";

import { Drawer } from "@base-ui/react/drawer";
import { ChevronRight, Menu, UserRound, UserRoundCheck, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore, type MouseEvent } from "react";
import { guardarRetornoDaPagina } from "@/components/conta/conta-link";
import { staggerStyle } from "@/components/motion/stagger";
import { useSessao } from "@/lib/sessao";
import { readJSON, STORAGE_KEYS, subscribeStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { ctaClasses } from "./cta-link";
import { ICONE_DO_HEADER } from "./header-estilos";

/*
  O menu do celular (abaixo de 768px, onde os links não cabem na linha do
  cabeçalho): o hambúrguer abre uma gaveta que desliza da direita com todas as
  páginas e, embaixo, a conta. "Meu plano" só aparece pra quem já tem um plano
  salvo neste navegador (sem plano, a página dele é o estado vazio).

  Gaveta do base-ui (Drawer, swipeDirection="right"): foco preso e devolvido
  ao hambúrguer, Esc e o fundo fecham, arrastar pra direita fecha, a rolagem
  da página trava. Os itens entram em cascata (rise-in).

  Tocar num item FECHA a gaveta e só navega quando ela acabou de fechar
  (onOpenChangeComplete): ao soltar a trava, a gaveta devolve a rolagem antiga,
  e uma página nova aberta antes disso pararia no meio. A saída leva
  --duration-exit (160ms).
*/

interface Pagina {
  href: string;
  label: string;
}

const PAGINAS: readonly Pagina[] = [
  { href: "/", label: "Início" },
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/calculadoras/juros-compostos", label: "Juros compostos" },
  { href: "/plano", label: "Montar meu plano" },
];
const MEU_PLANO: Pagina = { href: "/plano/resultado", label: "Meu plano" };

const temPlanoSalvo = () => readJSON<unknown>(STORAGE_KEYS.perfil, null) !== null;
const semPlanoNoServidor = () => false;

export function MenuMobile({ className }: { className?: string }) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const sessao = useSessao();
  const temPlano = useSyncExternalStore(subscribeStorage, temPlanoSalvo, semPlanoNoServidor);
  // pra onde ir quando a gaveta terminar de fechar
  const destino = useRef<string | null>(null);

  const paginas = temPlano ? [...PAGINAS, MEU_PLANO] : PAGINAS;
  const conta: Pagina = sessao ? { href: "/conta", label: "Sua conta" } : { href: "/entrar", label: "Entrar" };

  function aoTocar(e: MouseEvent<HTMLAnchorElement>, href: string) {
    // ctrl/cmd/shift-clique (ou o botão do meio) abre em outra aba: isso é do navegador
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    destino.current = href;
    setAberto(false);
  }

  function irAoDestino() {
    const href = destino.current;
    destino.current = null;
    if (!href) return;
    const [caminho, ancora] = href.split("#");
    if (ancora && caminho === pathname) {
      // âncora na própria página: rola até a seção (o Link não rolaria se o hash já estiver na URL)
      document.getElementById(ancora)?.scrollIntoView();
      window.history.replaceState(null, "", href);
      return;
    }
    if (href === pathname) return;
    if (href === "/entrar") guardarRetornoDaPagina();
    router.push(href, { transitionTypes: [href === "/" ? "nav-back" : "nav-forward"] });
  }

  return (
    <Drawer.Root
      open={aberto}
      onOpenChange={setAberto}
      onOpenChangeComplete={(abriu) => {
        if (!abriu) irAoDestino();
      }}
      swipeDirection="right"
    >
      <Drawer.Trigger aria-label="Abrir o menu" className={cn(ICONE_DO_HEADER, className)}>
        <Menu aria-hidden="true" className="size-5" />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Backdrop
          className={cn(
            "fixed inset-0 z-50 min-h-dvh bg-foreground/35 dark:bg-background/75",
            "opacity-[calc(1-var(--drawer-swipe-progress,0))]",
            "transition-opacity duration-(--duration-enter) ease-out-expo",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-(--duration-exit) data-[swiping]:duration-0",
            "motion-reduce:duration-[120ms]",
          )}
        />
        <Drawer.Viewport className="fixed inset-0 z-50 flex justify-end">
          <Drawer.Popup
            className={cn(
              "flex h-full w-[min(20rem,calc(100vw-3rem))] flex-col overflow-y-auto overscroll-contain outline-none",
              "border-l border-border bg-card text-card-foreground shadow-card",
              // segue o dedo; entra e sai deslizando pela direita
              "[transform:translateX(var(--drawer-swipe-movement-x,0px))]",
              "transition-[transform,opacity] duration-(--duration-enter) ease-out-expo",
              "data-[swiping]:duration-0 data-[swiping]:select-none data-[ending-style]:duration-(--duration-exit)",
              "motion-safe:data-[starting-style]:[transform:translateX(100%)] motion-safe:data-[ending-style]:[transform:translateX(100%)]",
              // reduced-motion: sem deslizar, só fade curto
              "motion-reduce:duration-[120ms] motion-reduce:data-[starting-style]:opacity-0 motion-reduce:data-[ending-style]:opacity-0",
            )}
          >
            {/* a linha de cima tem a altura do cabeçalho: o X cai onde estava o hambúrguer */}
            <div className="flex h-16 shrink-0 items-center justify-between pr-2 pl-5">
              <Drawer.Title className="eyebrow">Menu</Drawer.Title>
              <Drawer.Close aria-label="Fechar o menu" className={ICONE_DO_HEADER}>
                <X aria-hidden="true" className="size-5" />
              </Drawer.Close>
            </div>

            <nav aria-label="Páginas" className="px-3">
              <ul className="grid gap-1">
                {paginas.map((p, i) => {
                  const atual = p.href === pathname;
                  return (
                    <li key={p.href} className="rise-in" style={staggerStyle(i)}>
                      <Link
                        href={p.href}
                        onClick={(e) => aoTocar(e, p.href)}
                        aria-current={atual ? "page" : undefined}
                        className="press flex min-h-14 items-center justify-between gap-3 rounded-2xl px-4 text-lg font-bold text-ink-2 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card aria-[current=page]:bg-accent aria-[current=page]:text-foreground"
                      >
                        {p.label}
                        {atual ? (
                          <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-primary" />
                        ) : (
                          <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-ink-3" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div
              className="rise-in mt-auto border-t border-border px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
              style={staggerStyle(paginas.length)}
            >
              <Link
                href={conta.href}
                onClick={(e) => aoTocar(e, conta.href)}
                aria-current={conta.href === pathname ? "page" : undefined}
                className={cn(ctaClasses("outline", "lg"), "w-full")}
              >
                {sessao ? (
                  <UserRoundCheck aria-hidden="true" className="size-5 text-primary" />
                ) : (
                  <UserRound aria-hidden="true" className="size-5" />
                )}
                {conta.label}
              </Link>
            </div>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

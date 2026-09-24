"use client";

import { Drawer as BaseDrawer } from "@base-ui/react/drawer";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
  Gaveta que sobe de baixo (Drawer do @base-ui/react) com a cara do dindin:
  bg-card, rounded-t-3xl no celular; no sm+ vira um cartão flutuante centrado,
  com as quatro pontas arredondadas. Usada pelo "Novo pote", "Opções do pote" e
  o convite de conta.

  O base-ui já cuida do que importa: foco preso e devolvido a quem abriu, Esc
  fecha, fundo inerte e rolagem travada, arrastar pra baixo fecha. O título é
  obrigatório porque ele é o nome acessível da gaveta.

  Movimento: sobe com --duration-enter/ease-out-expo e fecha na velocidade do
  arraste (--drawer-swipe-strength). Em reduced-motion não desliza: só fade
  curto. O fundo escurece com tokens (foreground no claro, background no
  escuro), nunca preto literal.
*/

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** nome acessível e título visível (h2) */
  title: ReactNode;
  /** uma frase embaixo do título, ligada por aria-describedby */
  description?: ReactNode;
  children?: ReactNode;
  /** depois da animação de abrir/fechar — bom lugar pra limpar estado */
  onOpenChangeComplete?: (open: boolean) => void;
  /** o que recebe foco ao abrir (padrão: o primeiro focável) */
  initialFocus?: BaseDrawer.Popup.Props["initialFocus"];
  /** o que recebe foco ao fechar (padrão: quem abriu) */
  finalFocus?: BaseDrawer.Popup.Props["finalFocus"];
  /** texto do botão X (aria-label) */
  closeLabel?: string;
  /** classes extras no painel */
  className?: string;
}

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  onOpenChangeComplete,
  initialFocus,
  finalFocus,
  closeLabel = "Fechar",
  className,
}: DrawerProps) {
  return (
    <BaseDrawer.Root
      open={open}
      onOpenChange={(proximo) => onOpenChange(proximo)}
      onOpenChangeComplete={onOpenChangeComplete}
    >
      <BaseDrawer.VirtualKeyboardProvider>
        <BaseDrawer.Portal>
          <BaseDrawer.Backdrop
            className={cn(
              "fixed inset-0 z-50 min-h-dvh bg-foreground/35 dark:bg-background/75",
              "opacity-[calc(1-var(--drawer-swipe-progress,0))]",
              "transition-opacity duration-(--duration-enter) ease-out-expo",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-(--duration-exit) data-[swiping]:duration-0",
              "motion-reduce:duration-[120ms] motion-reduce:data-[ending-style]:duration-[120ms]",
            )}
          />
          <BaseDrawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center pb-(--drawer-keyboard-inset,0px) sm:px-4 sm:pb-[calc(1rem+var(--drawer-keyboard-inset,0px))]">
            <BaseDrawer.Popup
              initialFocus={initialFocus}
              finalFocus={finalFocus}
              className={cn(
                "relative flex max-h-[calc(100dvh-2.5rem)] w-full flex-col overflow-y-auto overscroll-contain outline-none",
                "rounded-t-3xl border border-b-0 border-border bg-card text-card-foreground shadow-card",
                "px-5 pt-3 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:max-w-lg sm:rounded-3xl sm:border-b sm:px-7 sm:pb-7",
                // segue o dedo; abre e fecha deslizando
                "[transform:translateY(var(--drawer-swipe-movement-y,0px))]",
                "transition-[transform,opacity] duration-(--duration-enter) ease-out-expo",
                "data-[swiping]:duration-0 data-[swiping]:select-none",
                "data-[ending-style]:duration-[calc(var(--drawer-swipe-strength,1)*var(--duration-enter))]",
                "motion-safe:data-[starting-style]:[transform:translateY(calc(100%+2rem))] motion-safe:data-[ending-style]:[transform:translateY(calc(100%+2rem))]",
                // reduced-motion: sem deslizar, só fade curto
                "motion-reduce:duration-[120ms] motion-reduce:data-[ending-style]:duration-[120ms] motion-reduce:data-[starting-style]:opacity-0 motion-reduce:data-[ending-style]:opacity-0",
                className,
              )}
            >
              {/* alça: só visual, o arraste funciona na gaveta inteira */}
              <div aria-hidden="true" className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-track sm:hidden" />
              <div className="flex items-start justify-between gap-3">
                <BaseDrawer.Title className="min-w-0 flex-1 pt-2 text-lg font-extrabold tracking-tight text-balance sm:text-xl">
                  {title}
                </BaseDrawer.Title>
                <BaseDrawer.Close
                  aria-label={closeLabel}
                  className="press -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-ink-3 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  <X aria-hidden="true" className="size-5" />
                </BaseDrawer.Close>
              </div>
              {description && (
                <BaseDrawer.Description className="mt-1 text-sm text-pretty text-ink-2">
                  {description}
                </BaseDrawer.Description>
              )}
              <BaseDrawer.Content className="mt-5 min-w-0">{children}</BaseDrawer.Content>
            </BaseDrawer.Popup>
          </BaseDrawer.Viewport>
        </BaseDrawer.Portal>
      </BaseDrawer.VirtualKeyboardProvider>
    </BaseDrawer.Root>
  );
}

/** Botão que fecha a gaveta onde está (ex.: "Cancelar"). Aceita as props de <button>. */
export const DrawerClose = BaseDrawer.Close;

"use client";

import { Toast as BaseToast } from "@base-ui/react/toast";
import { X } from "lucide-react";
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
  Avisos curtos embaixo da tela (Toast do @base-ui/react): "Pote Namoro
  removido. [Desfazer]", "Os outros potes diminuíram pra caber o Acelerado.
  [Desfazer]", "Você entrou como ana@email.com.".

  - Cada toast é role=status (anuncia sem interromper) e o botão de ação é
    focável; F6 leva o foco pros avisos (base-ui).
  - Some em 5 s; o tempo pausa com o mouse em cima, com foco dentro ou com a
    aba em segundo plano (base-ui). Arrastar pra baixo ou pro lado dispensa.
  - Entra subindo com fade e sai com fade curto (--duration-exit). Em
    reduced-motion, só fade.

  Uso: um <ToastProvider> por árvore (o de /plano/** mora em
  app/plano/layout.tsx; /entrar e /conta montam o próprio) e, dentro dela,
  `const toast = useToast(); toast.mostrar("Pote Namoro removido.", { acao: { onClick: desfazer } })`.
  Pode chamar já no primeiro efeito do filho: o gerente guarda o aviso até o
  Provider assinar (ver criarGerenteComFila).
*/

const DURACAO_PADRAO = 5000;

export interface AcaoToast {
  /** texto do botão; padrão "Desfazer" */
  rotulo?: string;
  onClick: () => void;
}

export interface OpcoesToast {
  /** botão opcional; o toast fecha sozinho depois do clique */
  acao?: AcaoToast;
  /** ms até sumir; 0 = só some quando a pessoa fecha. Padrão 5000. */
  duracao?: number;
  /** reusar o id atualiza o toast no lugar (e reinicia o tempo) em vez de empilhar */
  id?: string;
}

export interface ToastApi {
  /** mostra um aviso e devolve o id dele */
  mostrar: (mensagem: string, opcoes?: OpcoesToast) => string;
  /** fecha um aviso pelo id (sem id: fecha todos) */
  fechar: (id?: string) => void;
}

type Gerente = ReturnType<typeof BaseToast.createToastManager>;

const GerenteContext = createContext<Gerente | null>(null);

let contador = 0;
function novoId(): string {
  contador += 1;
  return `aviso-${contador}`;
}

/*
  O gerente do base-ui só emite pra quem já assinou, e o Provider assina no
  efeito DELE, que roda depois dos efeitos dos filhos (filho primeiro): um aviso
  disparado num efeito filho no mesmo commit em que o Provider monta se perdia.
  Este embrulho guarda add/close/update numa fila enquanto ninguém assina e
  entrega na ordem num microtask depois da assinatura — depois também do
  desmonta-remonta de efeitos do StrictMode em dev, que limpa os timers do
  store (entregue antes, o aviso nunca sumiria).
*/
function criarGerenteComFila(): Gerente {
  const base = BaseToast.createToastManager();
  const assinarBase = base[" subscribe"];
  let assinantes = 0;
  let fila: Array<() => void> = [];
  let agendado = false;

  function esvaziar() {
    agendado = false;
    if (assinantes === 0) return;
    const pendentes = fila;
    fila = [];
    for (const emitir of pendentes) emitir();
  }

  function agendar() {
    if (agendado || fila.length === 0) return;
    agendado = true;
    queueMicrotask(esvaziar);
  }

  function emitirOuGuardar(emitir: () => void) {
    // com fila pendente, entra atrás dela pra manter a ordem (ex.: add e depois close)
    if (assinantes > 0 && fila.length === 0) {
      emitir();
      return;
    }
    fila.push(emitir);
    if (assinantes > 0) agendar();
  }

  return {
    ...base,
    " subscribe"(listener) {
      const cancelar = assinarBase(listener);
      assinantes += 1;
      agendar();
      return () => {
        assinantes -= 1;
        cancelar();
      };
    },
    add(options) {
      // o id sai já, mesmo com o aviso na fila: quem chamou pode fechar ou atualizar por ele
      const id = options.id ?? novoId();
      emitirOuGuardar(() => base.add({ ...options, id }));
      return id;
    },
    close(id) {
      emitirOuGuardar(() => base.close(id));
    },
    update(id, updates) {
      emitirOuGuardar(() => base.update(id, updates));
    },
  };
}

export function ToastProvider({ children, timeout = DURACAO_PADRAO }: { children: ReactNode; timeout?: number }) {
  // um gerente por provider: quem só dispara aviso (useToast) não se redesenha quando a lista muda
  const [gerente] = useState(criarGerenteComFila);
  return (
    <BaseToast.Provider toastManager={gerente} timeout={timeout} limit={3}>
      <GerenteContext.Provider value={gerente}>{children}</GerenteContext.Provider>
      <BaseToast.Portal>
        <BaseToast.Viewport
          aria-label="Avisos"
          className="pointer-events-none fixed inset-x-0 bottom-0 z-60 flex flex-col-reverse items-center gap-2 px-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] outline-none sm:bottom-2"
        >
          <ListaDeToasts />
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
}

function ListaDeToasts() {
  const { toasts } = BaseToast.useToastManager();
  return toasts.map((toast) => (
    <BaseToast.Root
      key={toast.id}
      toast={toast}
      role="status"
      aria-modal={undefined}
      aria-atomic={true}
      className={cn(
        "pointer-events-auto flex w-full max-w-md min-w-0 items-center gap-1 rounded-2xl border border-border bg-card py-1.5 pr-1.5 pl-4 text-card-foreground shadow-card outline-none",
        "focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // segue o dedo no arraste e sai de onde parou
        "[transform:translateX(var(--toast-swipe-movement-x,0px))_translateY(var(--toast-swipe-movement-y,0px))]",
        "transition-[opacity,translate] duration-(--duration-enter) ease-out-expo",
        "data-[starting-style]:opacity-0 motion-safe:data-[starting-style]:translate-y-3",
        "data-[ending-style]:opacity-0 data-[ending-style]:duration-(--duration-exit)",
        "data-[limited]:hidden",
      )}
    >
      <BaseToast.Content className="flex min-w-0 flex-1 items-center gap-1">
        <BaseToast.Description className="min-w-0 flex-1 py-2 text-sm font-semibold text-pretty" />
        <BaseToast.Action className="press h-11 shrink-0 rounded-full px-4 text-sm font-bold text-primary outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card" />
        <BaseToast.Close
          aria-label="Fechar aviso"
          className="press flex size-11 shrink-0 items-center justify-center rounded-full text-ink-3 outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <X aria-hidden="true" className="size-4" />
        </BaseToast.Close>
      </BaseToast.Content>
    </BaseToast.Root>
  ));
}

/** Dispara avisos do ToastProvider mais próximo. Fora de um provider, lança (é erro de montagem). */
export function useToast(): ToastApi {
  const gerente = useContext(GerenteContext);
  if (!gerente) throw new Error("useToast precisa de um <ToastProvider> acima.");
  return useMemo<ToastApi>(
    () => ({
      mostrar(mensagem, opcoes = {}) {
        const id = opcoes.id ?? novoId();
        const { acao } = opcoes;
        gerente.add({
          id,
          description: mensagem,
          timeout: opcoes.duracao ?? undefined,
          priority: "low",
          actionProps: acao
            ? {
                children: acao.rotulo ?? "Desfazer",
                onClick: () => {
                  acao.onClick();
                  gerente.close(id);
                },
              }
            : undefined,
        });
        return id;
      },
      fechar(id) {
        gerente.close(id);
      },
    }),
    [gerente],
  );
}
